// worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 初始化数据库表（如果不存在）
    await initDatabase(env);
    
    // 处理主页请求
    if (path === '/' || path === '/index.html') {
      return new Response(htmlTemplate, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // 处理提交投诉请求
    if (path === '/submit' && request.method === 'POST') {
      try {
        const data = await request.json();
        
        // 插入数据到D1数据库
        const result = await env.DB.prepare(
          'INSERT INTO complaints (main_reason, sub_reason, contact, content, image_count, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          data.mainReason, 
          data.subReason || '', 
          data.contact,
          data.content,
          data.imageCount || 0,
          new Date().toISOString()
        ).run();
        
        console.log('数据插入成功，ID:', result.meta.last_row_id);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: '投诉提交成功',
          id: result.meta.last_row_id
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      } catch (error) {
        console.error('数据插入失败:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          message: '提交失败: ' + error.message 
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
    }
    
    // 处理管理后台请求
    if (path === '/admin') {
      try {
        // 获取投诉记录
        const { results } = await env.DB.prepare(
          'SELECT * FROM complaints ORDER BY created_at DESC'
        ).all();
        
        return new Response(adminTemplate(results), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      } catch (error) {
        return new Response('数据库查询失败: ' + error.message, { status: 500 });
      }
    }
    
    // 处理其他路径
    return new Response('页面未找到', { status: 404 });
  }
}

// 初始化数据库表
async function initDatabase(env) {
  try {
    // 创建投诉表（如果不存在）
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        main_reason TEXT NOT NULL,
        sub_reason TEXT,
        contact TEXT,
        content TEXT,
        image_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库表初始化失败:', error);
  }
}

// HTML模板（使用上面完整的HTML代码）
const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title> </title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        }
        
        body {
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        
        .header {
            padding: 20px;
            border-bottom: 1px solid #eee;
            text-align: center;
            font-size: 18px;
            font-weight: 600;
            color: #333;
            position: relative;
        }
        
        .back-btn {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 16px;
            color: #07C160;
            cursor: pointer;
        }
        
        .page {
            padding: 20px;
            display: none;
        }
        
        .page.active {
            display: block;
        }
        
        .reason-list {
            margin: 20px 0;
        }
        
        .reason-item {
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
        }
        
        .reason-item:last-child {
            border-bottom: none;
        }
        
        .reason-radio {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid #ccc;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        .reason-radio.selected::after {
            content: '';
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #07C160;
        }
        
        .reason-text {
            flex: 1;
            font-size: 16px;
        }
        
        .notice {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }
        
        .btn-group {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        
        .btn {
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
            border: none;
        }
        
        .btn-primary {
            background: #07C160;
            color: white;
        }
        
        .btn-primary:hover {
            background: #06ae56;
        }
        
        .btn-primary:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }
        
        .btn-secondary:hover {
            background: #e0e0e0;
        }
        
        .message {
            padding: 10px;
            border-radius: 8px;
            margin-top: 15px;
            text-align: center;
            display: none;
        }
        
        .success {
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
        }
        
        .error {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #ffcdd2;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .form-control {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }
        
        textarea.form-control {
            resize: vertical;
            min-height: 100px;
        }
        
        .upload-area {
            border: 1px dashed #ddd;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 10px;
            cursor: pointer;
        }
        
        .upload-icon {
            font-size: 40px;
            color: #ccc;
            margin-bottom: 10px;
        }
        
        .upload-text {
            color: #999;
        }
        
        .upload-count {
            text-align: right;
            color: #999;
            font-size: 14px;
        }
        
        .char-count {
            text-align: right;
            color: #999;
            font-size: 14px;
            margin-top: 5px;
        }
        
        .success-page {
            text-align: center;
            padding: 40px 20px;
        }
        
        .success-icon {
            font-size: 60px;
            color: #07C160;
            margin-bottom: 20px;
        }
        
        .success-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .success-text {
            color: #666;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- 第一页：投诉原因选择 -->
        <div class="page active" id="page-main">
            <div class="header">请选择投诉该帐号的原因</div>
            
            <div class="reason-list">
                <div class="reason-item" data-next="page-inappropriate">
                    <div class="reason-radio"></div>
                    <div class="reason-text">发布不适当内容对我造成骚扰</div>
                </div>
                <div class="reason-item" data-next="page-fraud">
                    <div class="reason-radio"></div>
                    <div class="reason-text">存在欺诈骗钱行为</div>
                </div>
                <div class="reason-item" data-next="page-submit">
                    <div class="reason-radio"></div>
                    <div class="reason-text">此账号可能被盗用了</div>
                </div>
                <div class="reason-item" data-next="page-submit">
                    <div class="reason-radio"></div>
                    <div class="reason-text">存在侵权行为</div>
                </div>
                <div class="reason-item" data-next="page-submit">
                    <div class="reason-radio"></div>
                    <div class="reason-text">发布仿冒品信息</div>
                </div>
                <div class="reason-item" data-next="page-submit">
                    <div class="reason-radio"></div>
                    <div class="reason-text">冒充他人</div>
                </div>
                <div class="reason-item" data-next="page-submit">
                    <div class="reason-radio"></div>
                    <div class="reason-text">侵犯未成年人权益</div>
                </div>
                <div class="reason-item" data-next="page-submit">
                    <div class="reason-radio"></div>
                    <div class="reason-text">粉丝无底线追星行为</div>
                </div>
            </div>
            
            <div class="notice">
                投诉须知：请确保您的投诉内容真实有效，虚假投诉可能承担相应法律责任。
            </div>
            
            <div class="btn-group">
                <button class="btn btn-primary" id="nextBtnMain" disabled>下一步</button>
            </div>
        </div>
        
        <!-- 第二页：不适当内容二级页面 -->
        <div class="page" id="page-inappropriate">
            <div class="header">
                <button class="back-btn" data-back="page-main">返回</button>
                请选择具体原因
            </div>
            
            <div class="reason-list">
                <div class="reason-item" data-value="色情">
                    <div class="reason-radio"></div>
                    <div class="reason-text">色情</div>
                </div>
                <div class="reason-item" data-value="违法犯罪及违禁品">
                    <div class="reason-radio"></div>
                    <div class="reason-text">违法犯罪及违禁品</div>
                </div>
                <div class="reason-item" data-value="赌博">
                    <div class="reason-radio"></div>
                    <div class="reason-text">赌博</div>
                </div>
                <div class="reason-item" data-value="政治谣言">
                    <div class="reason-radio"></div>
                    <div class="reason-text">政治谣言</div>
                </div>
                <div class="reason-item" data-value="暴恐血腥">
                    <div class="reason-radio"></div>
                    <div class="reason-text">暴恐血腥</div>
                </div>
                <div class="reason-item" data-value="其他违规内容">
                    <div class="reason-radio"></div>
                    <div class="reason-text">其他违规内容</div>
                </div>
            </div>
            
            <div class="btn-group">
                <button class="btn btn-secondary" data-back="page-main">上一步</button>
                <button class="btn btn-primary" id="nextBtnInappropriate" disabled>下一步</button>
            </div>
        </div>
        
        <!-- 第三页：欺诈行为二级页面 -->
        <div class="page" id="page-fraud">
            <div class="header">
                <button class="back-btn" data-back="page-main">返回</button>
                请选择具体原因
            </div>
            
            <div class="reason-list">
                <div class="reason-item" data-value="金融诈骗 (贷款/提额/代开/套现等)">
                    <div class="reason-radio"></div>
                    <div class="reason-text">金融诈骗 (贷款/提额/代开/套现等)</div>
                </div>
                <div class="reason-item" data-value="网络兼职刷单诈骗">
                    <div class="reason-radio"></div>
                    <div class="reason-text">网络兼职刷单诈骗</div>
                </div>
                <div class="reason-item" data-value="返利诈骗">
                    <div class="reason-radio"></div>
                    <div class="reason-text">返利诈骗</div>
                </div>
                <div class="reason-item" data-value="网络交友诈骗">
                    <div class="reason-radio"></div>
                    <div class="reason-text">网络交友诈骗</div>
                </div>
                <div class="reason-item" data-value="虚假投资理财诈骗">
                    <div class="reason-radio"></div>
                    <div class="reason-text">虚假投资理财诈骗</div>
                </div>
                <div class="reason-item" data-value="赌博诈骗">
                    <div class="reason-radio"></div>
                    <div class="reason-text">赌博诈骗</div>
                </div>
                <div class="reason-item" data-value="收款不发货">
                    <div class="reason-radio"></div>
                    <div class="reason-text">收款不发货</div>
                </div>
                <div class="reason-item" data-value="仿冒他人诈骗">
                    <div class="reason-radio"></div>
                    <div class="reason-text">仿冒他人诈骗</div>
                </div>
                <div class="reason-item" data-value="免费送诈骗">
                    <div class="reason-radio"></div>
                    <div class="reason-text">免费送诈骗</div>
                </div>
                <div class="reason-item" data-value="游戏相关诈骗(代练/充值等)">
                    <div class="reason-radio"></div>
                    <div class="reason-text">游戏相关诈骗(代练/充值等)</div>
                </div>
                <div class="reason-item" data-value="其他诈骗行为">
                    <div class="reason-radio"></div>
                    <div class="reason-text">其他诈骗行为</div>
                </div>
            </div>
            
            <div class="btn-group">
                <button class="btn btn-secondary" data-back="page-main">上一步</button>
                <button class="btn btn-primary" id="nextBtnFraud" disabled>下一步</button>
            </div>
        </div>
        
        <!-- 提交页面 -->
        <div class="page" id="page-submit">
            <div class="header">
                <button class="back-btn" id="backBtnSubmit">返回</button>
                提交投诉
            </div>
            
            <div class="form-group">
                <label for="contact">联系方式</label>
                <input type="text" id="contact" class="form-control" placeholder="填写联系方式">
            </div>
            
            <div class="form-group">
                <label>图片上传 <span id="uploadCount">0/9</span></label>
                <div class="upload-area" id="uploadArea">
                    <div class="upload-icon">+</div>
                    <div class="upload-text">点击上传图片</div>
                </div>
                <input type="file" id="fileInput" multiple accept="image/*" style="display: none;">
                <div id="imagePreview" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;"></div>
            </div>
            
            <div class="form-group">
                <label for="content">投诉内容 <span id="charCount">0/200</span></label>
                <textarea id="content" class="form-control" placeholder="投诉内容"></textarea>
            </div>
            
            <div class="btn-group">
                <button class="btn btn-secondary" id="backBtnPage">上一步</button>
                <button class="btn btn-primary" id="submitBtn" disabled>提交</button>
            </div>
        </div>
        
        <!-- 成功页面 -->
        <div class="page" id="page-success">
            <div class="success-page">
                <div class="success-icon">✓</div>
                <div class="success-title">提交成功</div>
                <div class="success-text">感谢您的反馈，我们会尽快处理您的投诉。</div>
                <button class="btn btn-primary" id="restartBtn">返回首页</button>
            </div>
        </div>
        
        <div class="message error" id="errorMessage">提交失败，请稍后重试</div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // 页面元素
            const pages = document.querySelectorAll('.page');
            const pageMain = document.getElementById('page-main');
            const pageInappropriate = document.getElementById('page-inappropriate');
            const pageFraud = document.getElementById('page-fraud');
            const pageSubmit = document.getElementById('page-submit');
            const pageSuccess = document.getElementById('page-success');
            
            // 按钮元素
            const nextBtnMain = document.getElementById('nextBtnMain');
            const nextBtnInappropriate = document.getElementById('nextBtnInappropriate');
            const nextBtnFraud = document.getElementById('nextBtnFraud');
            const submitBtn = document.getElementById('submitBtn');
            const restartBtn = document.getElementById('restartBtn');
            const backBtnSubmit = document.getElementById('backBtnSubmit');
            const backBtnPage = document.getElementById('backBtnPage');
            
            // 表单元素
            const contactInput = document.getElementById('contact');
            const contentInput = document.getElementById('content');
            const fileInput = document.getElementById('fileInput');
            const uploadArea = document.getElementById('uploadArea');
            const imagePreview = document.getElementById('imagePreview');
            const uploadCount = document.getElementById('uploadCount');
            const charCount = document.getElementById('charCount');
            
            // 消息元素
            const errorMessage = document.getElementById('errorMessage');
            
            // 数据存储
            let formData = {
                mainReason: null,
                subReason: null,
                contact: '',
                images: [],
                content: ''
            };
            
            let currentPage = 'page-main';
            let previousPage = null;
            
            // 页面切换函数
            function showPage(pageId, fromPage = null) {
                pages.forEach(page => page.classList.remove('active'));
                document.getElementById(pageId).classList.add('active');
                
                if (fromPage) {
                    previousPage = fromPage;
                }
                currentPage = pageId;
            }
            
            // 主页面逻辑
            const mainReasonItems = pageMain.querySelectorAll('.reason-item');
            mainReasonItems.forEach(item => {
                item.addEventListener('click', function() {
                    // 清除之前的选择
                    mainReasonItems.forEach(i => {
                        i.querySelector('.reason-radio').classList.remove('selected');
                    });
                    
                    // 设置当前选择
                    this.querySelector('.reason-radio').classList.add('selected');
                    formData.mainReason = this.querySelector('.reason-text').textContent;
                    
                    // 记录下一页
                    const nextPage = this.getAttribute('data-next');
                    formData.nextPage = nextPage;
                    
                    // 启用下一步按钮
                    nextBtnMain.disabled = false;
                });
            });
            
            nextBtnMain.addEventListener('click', function() {
                if (formData.nextPage === 'page-submit') {
                    // 直接跳转到提交页面
                    showPage('page-submit', 'page-main');
                } else {
                    // 跳转到二级页面
                    showPage(formData.nextPage, 'page-main');
                }
            });
            
            // 不适当内容页面逻辑
            const inappropriateItems = pageInappropriate.querySelectorAll('.reason-item');
            inappropriateItems.forEach(item => {
                item.addEventListener('click', function() {
                    // 清除之前的选择
                    inappropriateItems.forEach(i => {
                        i.querySelector('.reason-radio').classList.remove('selected');
                    });
                    
                    // 设置当前选择
                    this.querySelector('.reason-radio').classList.add('selected');
                    formData.subReason = this.getAttribute('data-value');
                    
                    // 启用下一步按钮
                    nextBtnInappropriate.disabled = false;
                });
            });
            
            nextBtnInappropriate.addEventListener('click', function() {
                showPage('page-submit', 'page-inappropriate');
            });
            
            // 欺诈行为页面逻辑
            const fraudItems = pageFraud.querySelectorAll('.reason-item');
            fraudItems.forEach(item => {
                item.addEventListener('click', function() {
                    // 清除之前的选择
                    fraudItems.forEach(i => {
                        i.querySelector('.reason-radio').classList.remove('selected');
                    });
                    
                    // 设置当前选择
                    this.querySelector('.reason-radio').classList.add('selected');
                    formData.subReason = this.getAttribute('data-value');
                    
                    // 启用下一步按钮
                    nextBtnFraud.disabled = false;
                });
            });
            
            nextBtnFraud.addEventListener('click', function() {
                showPage('page-submit', 'page-fraud');
            });
            
            // 返回按钮逻辑
            document.querySelectorAll('.back-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const backPage = this.getAttribute('data-back');
                    showPage(backPage);
                });
            });
            
            backBtnSubmit.addEventListener('click', function() {
                if (previousPage) {
                    showPage(previousPage);
                } else {
                    showPage('page-main');
                }
            });
            
            backBtnPage.addEventListener('click', function() {
                if (previousPage) {
                    showPage(previousPage);
                } else {
                    showPage('page-main');
                }
            });
            
            // 图片上传逻辑
            uploadArea.addEventListener('click', function() {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', function() {
                const files = Array.from(this.files);
                
                // 检查文件数量
                if (formData.images.length + files.length > 9) {
                    alert('最多只能上传9张图片');
                    return;
                }
                
                files.forEach(file => {
                    if (!file.type.startsWith('image/')) {
                        alert('请上传图片文件');
                        return;
                    }
                    
                    // 添加到数据
                    formData.images.push(file);
                    
                    // 创建预览
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.style.width = '80px';
                        img.style.height = '80px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '4px';
                        imagePreview.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
                
                // 更新计数
                uploadCount.textContent = `${formData.images.length}/9`;
                
                // 显示预览区域
                if (formData.images.length > 0) {
                    imagePreview.style.display = 'flex';
                }
                
                // 清空文件输入，以便可以再次选择相同文件
                this.value = '';
            });
            
            // 字符计数逻辑
            contentInput.addEventListener('input', function() {
                const length = this.value.length;
                charCount.textContent = `${length}/200`;
                
                if (length > 200) {
                    this.value = this.value.substring(0, 200);
                    charCount.textContent = '200/200';
                }
                
                formData.content = this.value;
                checkSubmitButton();
            });
            
            // 联系方式输入逻辑
            contactInput.addEventListener('input', function() {
                formData.contact = this.value;
                checkSubmitButton();
            });
            
            // 检查提交按钮状态
            function checkSubmitButton() {
                submitBtn.disabled = !(formData.contact && formData.content);
            }
            
            // 提交逻辑
            submitBtn.addEventListener('click', function() {
                // 禁用按钮防止重复提交
                submitBtn.disabled = true;
                submitBtn.textContent = '提交中...';
                
                // 准备提交数据
                const submitData = {
                    mainReason: formData.mainReason,
                    subReason: formData.subReason,
                    contact: formData.contact,
                    content: formData.content,
                    imageCount: formData.images.length
                };
                
                // 提交数据到后端
                submitComplaint(submitData)
                    .then(result => {
                        if (result.success) {
                            showPage('page-success');
                        } else {
                            errorMessage.style.display = 'block';
                            setTimeout(() => {
                                errorMessage.style.display = 'none';
                            }, 3000);
                            
                            // 重新启用提交按钮
                            submitBtn.disabled = false;
                            submitBtn.textContent = '提交';
                        }
                    })
                    .catch(error => {
                        console.error('提交失败:', error);
                        errorMessage.style.display = 'block';
                        setTimeout(() => {
                            errorMessage.style.display = 'none';
                        }, 3000);
                        
                        // 重新启用提交按钮
                        submitBtn.disabled = false;
                        submitBtn.textContent = '提交';
                    });
            });
            
            // 重新开始
            restartBtn.addEventListener('click', function() {
                resetForm();
                showPage('page-main');
            });
            
            // 提交投诉到后端
            async function submitComplaint(data) {
                try {
                    const response = await fetch('/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    });
                    
                    if (response.ok) {
                        return await response.json();
                    } else {
                        throw new Error('提交失败');
                    }
                } catch (error) {
                    throw error;
                }
            }
            
            // 重置表单
            function resetForm() {
                // 清除选择
                mainReasonItems.forEach(item => {
                    item.querySelector('.reason-radio').classList.remove('selected');
                });
                
                inappropriateItems.forEach(item => {
                    item.querySelector('.reason-radio').classList.remove('selected');
                });
                
                fraudItems.forEach(item => {
                    item.querySelector('.reason-radio').classList.remove('selected');
                });
                
                // 清空表单
                contactInput.value = '';
                contentInput.value = '';
                fileInput.value = '';
                imagePreview.innerHTML = '';
                imagePreview.style.display = 'none';
                
                // 重置计数
                uploadCount.textContent = '0/9';
                charCount.textContent = '0/200';
                
                // 重置数据
                formData = {
                    mainReason: null,
                    subReason: null,
                    contact: '',
                    images: [],
                    content: ''
                };
                
                // 重置按钮状态
                nextBtnMain.disabled = true;
                nextBtnInappropriate.disabled = true;
                nextBtnFraud.disabled = true;
                submitBtn.disabled = true;
                submitBtn.textContent = '提交';
                
                // 重置页面状态
                previousPage = null;
            }
        });
    </script>
</body>
</html>`; // 这里放置上面完整的HTML代码

// 管理后台模板
function adminTemplate(complaints) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投诉管理后台</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: #fff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #3498db;
        }
        
        .complaints-table {
            background-color: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        
        tr:hover {
            background-color: #f9f9f9;
        }
        
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #3498db;
            text-decoration: none;
        }
        
        .back-link:hover {
            text-decoration: underline;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>投诉管理后台</h1>
            <p>所有投诉记录</p>
        </header>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${complaints.length}</div>
                <div>总投诉数</div>
            </div>
        </div>
        
        <div class="complaints-table">
            ${complaints.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>主原因</th>
                        <th>子原因</th>
                        <th>联系方式</th>
                        <th>投诉内容</th>
                        <th>图片数量</th>
                        <th>提交时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${complaints.map(complaint => `
                    <tr>
                        <td>${complaint.id}</td>
                        <td>${complaint.main_reason}</td>
                        <td>${complaint.sub_reason || '无'}</td>
                        <td>${complaint.contact || '未填写'}</td>
                        <td>${complaint.content || '无'}</td>
                        <td>${complaint.image_count}</td>
                        <td>${new Date(complaint.created_at).toLocaleString('zh-CN')}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : `
            <div class="empty-state">
                <h3>暂无投诉记录</h3>
                <p>还没有用户提交投诉</p>
            </div>
            `}
        </div>
        
        <a href="/" class="back-link">返回投诉页面</a>
    </div>
</body>
</html>`;
}