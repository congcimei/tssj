-- 创建投诉表
CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    main_category TEXT NOT NULL,
    sub_category TEXT,
    contact TEXT NOT NULL,
    content TEXT NOT NULL,
    images TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(main_category, sub_category);

-- 创建状态更新触发器
CREATE TRIGGER IF NOT EXISTS update_complaints_timestamp 
AFTER UPDATE ON complaints
BEGIN
    UPDATE complaints SET updated_at = datetime('now') WHERE id = NEW.id;
END;