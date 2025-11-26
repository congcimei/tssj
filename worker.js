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
          'INSERT INTO complaints (reason, description, created_at) VALUES (?, ?, ?)'
        ).bind(data.reason, data.description || '', new Date().toISOString()).run();
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: '投诉提交成功',
          id: result.meta.last_row_id
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: '提交失败: ' + error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
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
        reason TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库表初始化失败:', error);
  }
}

// HTML模板（与之前相同）
const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>账号投诉系统</title>
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
            max-width: 800px;
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
            font-size: 24px;
        }
        
        .complaint-form {
            background-color: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .reason-options {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
        }
        
        @media (min-width: 768px) {
            .reason-options {
                grid-template-columns: 1fr 1fr;
            }
        }
        
        .reason-option {
            display: flex;
            align-items: center;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .reason-option:hover {
            background-color: #f9f9f9;
        }
        
        .reason-option.selected {
            border-color: #3498db;
            background-color: #f0f8ff;
        }
        
        .reason-option input {
            margin-right: 10px;
        }
        
        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: vertical;
            min-height: 120px;
        }
        
        .submit-btn {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.2s;
            width: 100%;
        }
        
        .submit-btn:hover {
            background-color: #2980b9;
        }
        
        .notification {
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            display: none;
        }
        
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        footer {
            text-align: center;
            margin-top: 30px;
            color: #7f8c8d;
            font-size: 14px;
        }
        
        .admin-link {
            display: block;
            text-align: center;
            margin-top: 20px;
            color: #3498db;
            text-decoration: none;
        }
        
        .admin-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1> </h1>
            <p>请选择投诉该帐号的原因：</p>
        </header>
        
        <div id="notification" class="notification"></div>
        
        <form class="complaint-form" id="complaintForm">
            <div class="form-group">
                <label>投诉原因：</label>
                <div class="reason-options" id="reasonOptions">
                    <label class="reason-option">
                        <input type="radio" name="reason" value="发布不适当内容对我造成骚扰">
                        <span>发布不适当内容对我造成骚扰</span>
                    </label>
                    <label class="reason-option">
                        <input type="radio" name="reason" value="存在欺诈骗钱行为">
                        <span>存在欺诈骗钱行为</span>
                    </label>
                    <label class="reason-option">
                        <input type="radio" name="reason" value="此账号可能被盗用了">
                        <span>此账号可能被盗用了</span>
                    </label>
                    <label class="reason-option">
                        <input type="radio" name="reason" value="存在侵权行为">
                        <span>存在侵权行为</span>
                    </label>
                    <label class="reason-option">
                        <input type="radio" name="reason" value="发布仿冒品信息">
                        <span>发布仿冒品信息</span>
                    </label>
                    <label class="reason-option">
                        <input type="radio" name="reason" value="冒充他人">
                        <span>冒充他人</span>
                    </label>
                    <label class="reason-option">
                        <input type="radio" name="reason" value="侵犯未成年人权益">
                        <span>侵犯未成年人权益</span>
                    </label>
                    <label class="reason-option">
                        <input type="radio" name="reason" value="粉丝无底线追星行为">
                        <span>粉丝无底线追星行为</span>
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label for="description">详细描述（可选）：</label>
                <textarea id="description" name="description" placeholder="请提供更多详细信息..."></textarea>
            </div>
            
            <button type="submit" class="submit-btn">提交投诉</button>
        </form>
        
        <a href="/admin" class="admin-link">管理后台</a>
        
        <footer>
            <p>投诉须知：请确保您的投诉内容真实有效，虚假投诉可能承担相应法律责任。</p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('complaintForm');
            const reasonOptions = document.querySelectorAll('.reason-option');
            const notification = document.getElementById('notification');
            
            // 添加单选按钮选择效果
            reasonOptions.forEach(option => {
                const radio = option.querySelector('input[type="radio"]');
                
                option.addEventListener('click', function() {
                    reasonOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    radio.checked = true;
                });
            });
            
            // 处理表单提交
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(form);
                const reason = formData.get('reason');
                const description = formData.get('description');
                
                if (!reason) {
                    showNotification('请选择投诉原因', 'error');
                    return;
                }
                
                try {
                    const response = await fetch('/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            reason: reason,
                            description: description
                        })
                    });
                    
                    if (response.ok) {
                        showNotification('投诉提交成功！', 'success');
                        form.reset();
                        reasonOptions.forEach(opt => opt.classList.remove('selected'));
                    } else {
                        throw new Error('提交失败');
                    }
                } catch (error) {
                    showNotification('提交失败，请稍后重试', 'error');
                }
            });
            
            function showNotification(message, type) {
                notification.textContent = message;
                notification.className = 'notification ' + type;
                notification.style.display = 'block';
                
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 5000);
            }
        });
    </script>
</body>
</html>`;

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
                        <th>投诉原因</th>
                        <th>详细描述</th>
                        <th>提交时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${complaints.map(complaint => `
                    <tr>
                        <td>${complaint.id}</td>
                        <td>${complaint.reason}</td>
                        <td>${complaint.description || '无'}</td>
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