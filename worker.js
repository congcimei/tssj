// 自动初始化数据库函数
async function initializeDatabase(env) {
  try {
    // 检查表是否存在
    const tableCheck = await env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='complaints'
    `).first();
    
    if (!tableCheck) {
      console.log('首次运行：自动创建数据库表中...');
      await env.DB.exec(`
        CREATE TABLE complaints (
          id TEXT PRIMARY KEY,
          main_category TEXT NOT NULL,
          sub_category TEXT,
          contact TEXT NOT NULL,
          content TEXT NOT NULL,
          images TEXT DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL
        )
      `);
      console.log('数据库表创建成功！');
    }
  } catch (error) {
    console.error('数据库初始化错误:', error);
  }
}

export default {
  async fetch(request, env, ctx) {
    // 每次请求时自动检查数据库
    await initializeDatabase(env);
    
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 路由处理 - 修复：确保路径匹配正确
    if (path === '/' || path === '/index.html') {
      return serveIndexPage();
    } else if (path === '/submit') {
      return serveSubmitPage();
    } else if (path === '/success') {
      return serveSuccessPage();
    } else if (path === '/admin') {
      return await handleAdminRoute(request, env);
    } else if (path === '/api/complaints' && method === 'POST') {
      return await handleComplaintSubmit(request, env, corsHeaders);
    } else if (path === '/api/complaints' && method === 'GET') {
      return await getComplaints(request, env, corsHeaders);
    } else if (path.startsWith('/api/complaints/') && method === 'DELETE') {
      return await deleteComplaint(request, env, path, corsHeaders);
    } else if (path === '/api/admin/login' && method === 'POST') {
      return await handleAdminLogin(request, env, corsHeaders);
    } else if (path.startsWith('/api/complaints/') && method === 'PUT') {
      return await updateComplaintStatus(request, env, path, corsHeaders);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// 首页
function serveIndexPage() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>投诉系统</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, sans-serif; 
            background: #f5f5f5; color: #333; line-height: 1.6;
            max-width: 100vw; overflow-x: hidden;
        }
        @media (min-width: 768px) {
            body { max-width: 414px; margin: 0 auto; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; min-height: 100vh; }
        }
        .header { background: #07C160; color: white; padding: 15px; text-align: center; }
        .header h1 { font-size: 18px; font-weight: normal; }
        .complaint-list { background: white; margin-top: 10px; }
        .complaint-item { padding: 15px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .complaint-item:last-child { border-bottom: none; }
        .complaint-item .arrow { color: #999; font-size: 14px; }
        .complaint-content { flex: 1; }
        .complaint-title { font-size: 16px; margin-bottom: 5px; }
        .complaint-desc { font-size: 14px; color: #999; }
        .sub-category { background: #fafafa; padding-left: 15px; display: none; }
        .sub-item { padding: 12px 15px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .sub-item:last-child { border-bottom: none; }
        .admin-link { text-align: center; margin: 20px; }
        .admin-link a { color: #07C160; text-decoration: none; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>投诉</h1>
    </div>
    
    <div class="complaint-list">
        <div class="complaint-item" onclick="toggleSubCategory('inappropriate')">
            <div class="complaint-content">
                <div class="complaint-title">发布不适当内容对我造成骚扰</div>
                <div class="complaint-desc">色情、暴力、违法信息等</div>
            </div>
            <div class="arrow">></div>
        </div>
        <div id="inappropriate" class="sub-category">
            <div class="sub-item" onclick="goToSubmit('inappropriate', '色情')"><div>色情</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('inappropriate', '违法犯罪及违禁品')"><div>违法犯罪及违禁品</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('inappropriate', '赌博')"><div>赌博</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('inappropriate', '政治谣言')"><div>政治谣言</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('inappropriate', '暴恐血腥')"><div>暴恐血腥</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('inappropriate', '其他违规内容')"><div>其他违规内容</div><div class="arrow">></div></div>
        </div>
        
        <div class="complaint-item" onclick="toggleSubCategory('fraud')">
            <div class="complaint-content">
                <div class="complaint-title">存在欺诈骗钱行为</div>
                <div class="complaint-desc">金融诈骗、网络兼职诈骗等</div>
            </div>
            <div class="arrow">></div>
        </div>
        <div id="fraud" class="sub-category">
            <div class="sub-item" onclick="goToSubmit('fraud', '金融诈骗')"><div>金融诈骗 (贷款/提额/代开/套现等)</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '网络兼职刷单诈骗')"><div>网络兼职刷单诈骗</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '返利诈骗')"><div>返利诈骗</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '网络交友诈骗')"><div>网络交友诈骗</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '虚假投资理财诈骗')"><div>虚假投资理财诈骗</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '赌博诈骗')"><div>赌博诈骗</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '收款不发货')"><div>收款不发货</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '仿冒他人诈骗')"><div>仿冒他人诈骗</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '免费送诈骗')"><div>免费送诈骗</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '游戏相关诈骗')"><div>游戏相关诈骗(代练/充值等)</div><div class="arrow">></div></div>
            <div class="sub-item" onclick="goToSubmit('fraud', '其他诈骗行为')"><div>其他诈骗行为</div><div class="arrow">></div></div>
        </div>
        
        <div class="complaint-item" onclick="goToSubmitDirect('account_theft', '此账号可能被盗用了')">
            <div class="complaint-content">
                <div class="complaint-title">此账号可能被盗用了</div>
                <div class="complaint-desc">账号异常登录、发布异常内容</div>
            </div>
            <div class="arrow">></div>
        </div>
        
        <div class="complaint-item" onclick="goToSubmitDirect('infringement', '存在侵权行为')">
            <div class="complaint-content">
                <div class="complaint-title">存在侵权行为</div>
                <div class="complaint-desc">侵犯版权、商标权等</div>
            </div>
            <div class="arrow">></div>
        </div>
        
        <div class="complaint-item" onclick="goToSubmitDirect('counterfeit', '发布仿冒品信息')">
            <div class="complaint-content">
                <div class="complaint-title">发布仿冒品信息</div>
                <div class="complaint-desc">假冒伪劣商品信息</div>
            </div>
            <div class="arrow">></div>
        </div>
        
        <div class="complaint-item" onclick="goToSubmitDirect('impersonation', '冒充他人')">
            <div class="complaint-content">
                <div class="complaint-title">冒充他人</div>
                <div class="complaint-desc">冒用他人身份信息</div>
            </div>
            <div class="arrow">></div>
        </div>
        
        <div class="complaint-item" onclick="goToSubmitDirect('minors', '侵犯未成年人权益')">
            <div class="complaint-content">
                <div class="complaint-title">侵犯未成年人权益</div>
                <div class="complaint-desc">危害未成年人身心健康</div>
            </div>
            <div class="arrow">></div>
        </div>
        
        <div class="complaint-item" onclick="goToSubmitDirect('fan_behavior', '粉丝无底线追星行为')">
            <div class="complaint-content">
                <div class="complaint-title">粉丝无底线追星行为</div>
                <div class="complaint-desc">过度追星、网络暴力等</div>
            </div>
            <div class="arrow">></div>
        </div>
    </div>

    <div class="admin-link">
        <a href="/admin">管理后台</a>
    </div>

    <script>
        function toggleSubCategory(categoryId) {
            const element = document.getElementById(categoryId);
            element.style.display = element.style.display === 'block' ? 'none' : 'block';
        }
        
        function goToSubmit(category, subCategory) {
            const mainCategory = getMainCategoryName(category);
            localStorage.setItem('complaintCategory', mainCategory);
            localStorage.setItem('complaintSubCategory', subCategory);
            window.location.href = '/submit';
        }
        
        function goToSubmitDirect(category, categoryName) {
            localStorage.setItem('complaintCategory', categoryName);
            localStorage.setItem('complaintSubCategory', '');
            window.location.href = '/submit';
        }
        
        function getMainCategoryName(category) {
            const names = {
                'inappropriate': '发布不适当内容对我造成骚扰',
                'fraud': '存在欺诈骗钱行为',
                'account_theft': '此账号可能被盗用了',
                'infringement': '存在侵权行为',
                'counterfeit': '发布仿冒品信息',
                'impersonation': '冒充他人',
                'minors': '侵犯未成年人权益',
                'fan_behavior': '粉丝无底线追星行为'
            };
            return names[category] || category;
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 提交页面
function serveSubmitPage() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>提交投诉</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, sans-serif; 
            background: #f5f5f5; color: #333; line-height: 1.6;
            max-width: 100vw; overflow-x: hidden;
        }
        @media (min-width: 768px) {
            body { max-width: 414px; margin: 0 auto; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; min-height: 100vh; }
        }
        .header { background: #07C160; color: white; padding: 15px; text-align: center; position: relative; }
        .form-section { background: white; margin-top: 10px; padding: 15px; }
        .category-info { background: #f8f8f8; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 8px; font-size: 16px; color: #333; }
        .form-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; background: #fff; }
        textarea.form-input { min-height: 100px; resize: vertical; }
        .image-upload { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
        .upload-item { width: 100%; height: 80px; border: 1px dashed #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fafafa; cursor: pointer; }
        .upload-item .plus { font-size: 24px; color: #999; }
        .image-count { font-size: 14px; color: #999; margin-top: 5px; }
        .submit-btn { background: #07C160; color: white; border: none; padding: 15px; border-radius: 4px; font-size: 16px; width: 100%; cursor: pointer; margin-top: 20px; }
        .submit-btn:disabled { background: #ccc; cursor: not-allowed; }
        .required::after { content: " *"; color: red; }
    </style>
</head>
<body>
    <div class="header">
        <h1>提交投诉</h1>
    </div>
    
    <div class="form-section">
        <div class="category-info">
            <div id="categoryDisplay">投诉类型加载中...</div>
        </div>
        
        <div class="form-group">
            <label class="form-label required">联系方式</label>
            <input type="text" class="form-input" id="contact" placeholder="请填写您的联系方式" oninput="checkFormValidity()">
        </div>
        
        <div class="form-group">
            <label class="form-label">图片上传</label>
            <div class="image-upload" id="imageUpload">
                <div class="upload-item" onclick="triggerImageUpload()"><div class="plus">+</div></div>
            </div>
            <div class="image-count" id="imageCount">0/9</div>
            <input type="file" id="imageInput" multiple accept="image/*" style="display: none;" onchange="handleImageSelect(event)">
        </div>
        
        <div class="form-group">
            <label class="form-label required">投诉内容</label>
            <textarea class="form-input" id="complaintContent" placeholder="请详细描述投诉内容" oninput="checkFormValidity()"></textarea>
        </div>
        
        <button class="submit-btn" id="submitBtn" disabled onclick="submitComplaint()">提交</button>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const mainCategory = localStorage.getItem('complaintCategory');
            const subCategory = localStorage.getItem('complaintSubCategory');
            let displayText = mainCategory;
            if (subCategory) displayText += ' - ' + subCategory;
            document.getElementById('categoryDisplay').textContent = displayText;
        });
        
        let selectedImages = [];
        
        function triggerImageUpload() { document.getElementById('imageInput').click(); }
        
        function handleImageSelect(event) {
            const files = event.target.files;
            if (selectedImages.length + files.length > 9) {
                alert('最多只能上传9张图片'); return;
            }
            
            for (let i = 0; i < files.length; i++) {
                if (selectedImages.length >= 9) break;
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        selectedImages.push({ file: file, dataUrl: e.target.result });
                        updateImageDisplay();
                    };
                    reader.readAsDataURL(file);
                }
            }
            event.target.value = '';
        }
        
        function updateImageDisplay() {
            const container = document.getElementById('imageUpload');
            const countElement = document.getElementById('imageCount');
            container.innerHTML = '';
            
            selectedImages.forEach((image, index) => {
                const imgItem = document.createElement('div');
                imgItem.className = 'upload-item';
                imgItem.style.backgroundImage = 'url(' + image.dataUrl + ')';
                imgItem.style.backgroundSize = 'cover';
                imgItem.style.backgroundPosition = 'center';
                imgItem.style.position = 'relative';
                
                const deleteBtn = document.createElement('div');
                deleteBtn.innerHTML = '×';
                deleteBtn.style.cssText = 'position:absolute;top:-5px;right:-5px;background:red;color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;';
                deleteBtn.onclick = function(e) {
                    e.stopPropagation();
                    selectedImages.splice(index, 1);
                    updateImageDisplay();
                };
                imgItem.appendChild(deleteBtn);
                container.appendChild(imgItem);
            });
            
            if (selectedImages.length < 9) {
                const uploadBtn = document.createElement('div');
                uploadBtn.className = 'upload-item';
                uploadBtn.innerHTML = '<div class="plus">+</div>';
                uploadBtn.onclick = triggerImageUpload;
                container.appendChild(uploadBtn);
            }
            
            countElement.textContent = selectedImages.length + '/9';
        }
        
        function checkFormValidity() {
            const contact = document.getElementById('contact').value.trim();
            const content = document.getElementById('complaintContent').value.trim();
            document.getElementById('submitBtn').disabled = !(contact && content);
        }
        
        async function submitComplaint() {
            const contact = document.getElementById('contact').value.trim();
            const content = document.getElementById('complaintContent').value.trim();
            const mainCategory = localStorage.getItem('complaintCategory');
            const subCategory = localStorage.getItem('complaintSubCategory');
            
            if (!contact || !content) { alert('请填写必填字段'); return; }
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = '提交中...';
            
            try {
                const complaintData = {
                    mainCategory: mainCategory,
                    subCategory: subCategory,
                    contact: contact,
                    content: content,
                    images: selectedImages.map((img, index) => ({
                        name: 'image_' + (index + 1) + '.jpg',
                        size: img.file.size,
                        type: img.file.type
                    }))
                };
                
                const response = await fetch('/api/complaints', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(complaintData)
                });
                
                // 修复：检查响应状态
                if (!response.ok) {
                    throw new Error(`HTTP错误! 状态: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    localStorage.removeItem('complaintCategory');
                    localStorage.removeItem('complaintSubCategory');
                    window.location.href = '/success';
                } else {
                    throw new Error(result.error || '提交失败');
                }
            } catch (error) {
                alert('提交失败: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = '提交';
            }
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 成功页面
function serveSuccessPage() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>提交成功</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, sans-serif; 
            background: #f5f5f5; color: #333; 
            display: flex; justify-content: center; align-items: center; min-height: 100vh; text-align: center;
            max-width: 100vw; overflow-x: hidden;
        }
        @media (min-width: 768px) {
            body { max-width: 414px; margin: 0 auto; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; min-height: 100vh; }
        }
        .success-container { background: white; padding: 40px 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 300px; width: 90%; }
        .success-icon { font-size: 60px; color: #07C160; margin-bottom: 20px; }
        .success-title { font-size: 18px; margin-bottom: 10px; color: #333; }
        .success-message { font-size: 14px; color: #666; margin-bottom: 25px; line-height: 1.5; }
        .back-btn { background: #07C160; color: white; border: none; padding: 12px 30px; border-radius: 4px; font-size: 16px; cursor: pointer; width: 100%; }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">✓</div>
        <div class="success-title">提交成功</div>
        <div class="success-message">感谢您的反馈，我们会在3个工作日内处理您的投诉。<br>请保持联系方式畅通。</div>
        <button class="back-btn" onclick="goBackToHome()">返回首页</button>
    </div>
    <script>function goBackToHome() { window.location.href = '/'; }</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 管理后台路由处理
async function handleAdminRoute(request, env) {
  const url = new URL(request.url);
  
  // 检查是否已登录
  const cookieHeader = request.headers.get('Cookie') || '';
  const isLoggedIn = cookieHeader.includes('admin_authenticated=true');
  
  if (!isLoggedIn) {
    // 未登录，显示登录页面
    return serveAdminLoginPage();
  }
  
  // 已登录，显示管理后台
  try {
    const complaints = await env.DB.prepare(`
      SELECT id, main_category, sub_category, contact, content, images, status, created_at
      FROM complaints ORDER BY created_at DESC
    `).all();
    
    return serveAdminDashboard(complaints.results);
  } catch (error) {
    return new Response('数据库错误: ' + error.message, { 
      status: 500,
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// 管理员登录页面
function serveAdminLoginPage() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台登录</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            background: #f5f5f5; 
            display: flex; justify-content: center; align-items: center; 
            min-height: 100vh; 
        }
        .login-container { 
            background: white; padding: 40px; border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            width: 100%; max-width: 400px; 
        }
        .login-title { text-align: center; margin-bottom: 30px; color: #333; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 8px; font-weight: 500; }
        .form-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
        .login-btn { background: #07C160; color: white; border: none; padding: 12px; border-radius: 4px; font-size: 16px; width: 100%; cursor: pointer; }
        .error-message { color: red; text-align: center; margin-top: 10px; display: none; }
        .back-link { text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="login-container">
        <h1 class="login-title">管理后台登录</h1>
        <form id="loginForm">
            <div class="form-group">
                <label class="form-label">密码</label>
                <input type="password" class="form-input" id="password" required>
            </div>
            <button type="submit" class="login-btn">登录</button>
            <div class="error-message" id="errorMessage">密码错误</div>
        </form>
        <div class="back-link">
            <a href="/">返回首页</a>
        </div>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            
            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password })
                });
                
                const result = await response.json();
                if (result.success) {
                    window.location.href = '/admin';
                } else {
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = '网络错误';
                errorMessage.style.display = 'block';
            }
        });
    </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 管理后台主页面
function serveAdminDashboard(complaints) {
  const complaintsHtml = complaints.map(complaint => `
    <div class="complaint-item">
      <div class="complaint-header">
        <strong>${escapeHtml(complaint.main_category)}</strong>
        ${complaint.sub_category ? ` - ${escapeHtml(complaint.sub_category)}` : ''}
        <span class="status ${complaint.status}">${complaint.status}</span>
      </div>
      <div class="complaint-info">
        <div><strong>联系方式:</strong> ${escapeHtml(complaint.contact)}</div>
        <div><strong>提交时间:</strong> ${new Date(complaint.created_at).toLocaleString()}</div>
      </div>
      <div class="complaint-content">
        <strong>投诉内容:</strong> ${escapeHtml(complaint.content)}
      </div>
      <div class="complaint-actions">
        <button onclick="updateStatus('${complaint.id}', 'processing')">标记为处理中</button>
        <button onclick="updateStatus('${complaint.id}', 'resolved')">标记为已解决</button>
        <button onclick="deleteComplaint('${complaint.id}')" class="delete-btn">删除</button>
      </div>
    </div>
  `).join('');
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            background: #f5f5f5; padding: 20px; 
        }
        .admin-header { 
            background: #07C160; color: white; padding: 15px; 
            border-radius: 8px; margin-bottom: 20px; 
            display: flex; justify-content: space-between; align-items: center; 
        }
        .complaint-item { 
            background: white; padding: 20px; margin-bottom: 15px; 
            border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
        }
        .complaint-header { 
            display: flex; justify-content: space-between; align-items: center; 
            margin-bottom: 10px; 
        }
        .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status.pending { background: #fff3cd; color: #856404; }
        .status.processing { background: #cce7ff; color: #004085; }
        .status.resolved { background: #d4edda; color: #155724; }
        .complaint-info { margin-bottom: 10px; color: #666; }
        .complaint-content { margin-bottom: 15px; line-height: 1.5; }
        .complaint-actions button { 
            margin-right: 10px; padding: 5px 10px; 
            border: 1px solid #ddd; border-radius: 4px; cursor: pointer; 
        }
        .complaint-actions .delete-btn { 
            background: #dc3545; color: white; border-color: #dc3545; 
        }
        .logout-btn { 
            background: #6c757d; color: white; border: none; 
            padding: 8px 16px; border-radius: 4px; cursor: pointer; 
        }
        .back-link { margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="back-link">
        <a href="/">← 返回首页</a>
    </div>
    <div class="admin-header">
        <h1>投诉管理后台 (共 ${complaints.length} 条投诉)</h1>
        <button class="logout-btn" onclick="logout()">退出登录</button>
    </div>
    <div id="complaintsList">
        ${complaints.length > 0 ? complaintsHtml : '<p>暂无投诉数据</p>'}
    </div>
    
    <script>
        async function updateStatus(complaintId, status) {
            if (!confirm('确定要更新状态吗？')) return;
            
            try {
                const response = await fetch('/api/complaints/' + complaintId, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: status })
                });
                
                if (response.ok) {
                    alert('状态更新成功');
                    location.reload();
                } else {
                    alert('状态更新失败');
                }
            } catch (error) {
                alert('网络错误: ' + error.message);
            }
        }
        
        async function deleteComplaint(complaintId) {
            if (!confirm('确定要删除这条投诉吗？此操作不可恢复。')) return;
            
            try {
                const response = await fetch('/api/complaints/' + complaintId, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('删除成功');
                    location.reload();
                } else {
                    alert('删除失败: ' + result.error);
                }
            } catch (error) {
                alert('网络错误: ' + error.message);
            }
        }
        
        function logout() {
            document.cookie = 'admin_authenticated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/admin';
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 处理投诉提交
async function handleComplaintSubmit(request, env, corsHeaders) {
  try {
    let data;
    try {
      const text = await request.text();
      data = JSON.parse(text);
    } catch (error) {
      return jsonResponse({ success: false, error: '无效的JSON数据' }, 400, corsHeaders);
    }
    
    if (!data.mainCategory || !data.contact || !data.content) {
      return jsonResponse({ 
        success: false, 
        error: '投诉类型、联系方式和投诉内容为必填项' 
      }, 400, corsHeaders);
    }

    const complaintId = generateId();
    const createdAt = new Date().toISOString();

    const result = await env.DB.prepare(`
      INSERT INTO complaints (id, main_category, sub_category, contact, content, images, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      complaintId,
      data.mainCategory,
      data.subCategory || '',
      data.contact,
      data.content,
      JSON.stringify(data.images || []),
      'pending',
      createdAt
    ).run();

    if (result.success) {
      return jsonResponse({
        success: true,
        complaintId: complaintId,
        message: '投诉提交成功'
      }, 200, corsHeaders);
    } else {
      return jsonResponse({
        success: false,
        error: '数据库存储失败'
      }, 500, corsHeaders);
    }
  } catch (error) {
    console.error('提交投诉错误:', error);
    return jsonResponse({
      success: false,
      error: '提交失败: ' + error.message
    }, 500, corsHeaders);
  }
}

// 管理员登录
async function handleAdminLogin(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const correctPassword = env.ADMIN_PASSWORD || 'admin123';
    
    if (data.password === correctPassword) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'admin_authenticated=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400',
          ...corsHeaders
        }
      });
    } else {
      return jsonResponse({ success: false, error: '密码错误' }, 401, corsHeaders);
    }
  } catch (error) {
    return jsonResponse({ success: false, error: '登录失败' }, 500, corsHeaders);
  }
}

// 获取投诉列表
async function getComplaints(request, env, corsHeaders) {
  try {
    const complaints = await env.DB.prepare(`
      SELECT id, main_category, sub_category, contact, content, images, status, created_at
      FROM complaints ORDER BY created_at DESC LIMIT 100
    `).all();

    return jsonResponse({
      success: true,
      complaints: complaints.results
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500, corsHeaders);
  }
}

// 删除投诉
async function deleteComplaint(request, env, path, corsHeaders) {
  const complaintId = path.split('/').pop();
  try {
    const result = await env.DB.prepare('DELETE FROM complaints WHERE id = ?').bind(complaintId).run();
    return jsonResponse({ 
      success: !!result.success, 
      message: result.success ? '投诉删除成功' : '删除失败' 
    }, result.success ? 200 : 500, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500, corsHeaders);
  }
}

// 更新投诉状态
async function updateComplaintStatus(request, env, path, corsHeaders) {
  const complaintId = path.split('/').pop();
  try {
    const data = await request.json();
    const result = await env.DB.prepare('UPDATE complaints SET status = ? WHERE id = ?')
      .bind(data.status, complaintId)
      .run();
    
    return jsonResponse({ 
      success: !!result.success, 
      message: result.success ? '状态更新成功' : '更新失败' 
    }, result.success ? 200 : 500, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500, corsHeaders);
  }
}

// 工具函数
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}