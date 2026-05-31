import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { adminAPI, alumniAPI } from '../services/api';

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [reminders, setReminders] = useState([]);
  const [reminderPagination, setReminderPagination] = useState({ page: 1 });
  const [alumniWithoutUpdates, setAlumniWithoutUpdates] = useState([]);
  const [selectedAlumni, setSelectedAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const loadDashboard = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('加载仪表盘失败:', error);
    }
  };

  const loadReminders = async () => {
    try {
      const response = await adminAPI.getReminders({ page: reminderPagination.page });
      setReminders(response.data.reminders);
      setReminderPagination(response.data.pagination);
    } catch (error) {
      console.error('加载提醒列表失败:', error);
    }
  };

  const loadAlumniWithoutUpdates = async () => {
    try {
      const response = await adminAPI.getAlumniWithoutUpdates({ days: 180 });
      setAlumniWithoutUpdates(response.data.alumni);
    } catch (error) {
      console.error('加载未更新校友失败:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadDashboard();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'reminders') {
      loadReminders();
    } else if (activeTab === 'send-reminders') {
      loadAlumniWithoutUpdates();
    }
  }, [activeTab]);

  const handleSendReminder = async (userId, userName) => {
    if (!window.confirm(`确定要向 ${userName} 发送更新提醒吗？`)) {
      return;
    }

    try {
      await adminAPI.sendReminder({ target_user_id: userId });
      setMessage({ type: 'success', text: `已向 ${userName} 发送更新提醒！` });
      loadDashboard();
      if (activeTab === 'send-reminders') {
        loadAlumniWithoutUpdates();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '发送提醒失败' 
      });
    }
  };

  const handleBatchSendReminders = async () => {
    if (selectedAlumni.length === 0) {
      setMessage({ type: 'error', text: '请至少选择一位校友' });
      return;
    }

    if (!window.confirm(`确定要向 ${selectedAlumni.length} 位校友发送更新提醒吗？`)) {
      return;
    }

    try {
      await adminAPI.sendBatchReminders({ target_user_ids: selectedAlumni });
      setMessage({ type: 'success', text: `已向 ${selectedAlumni.length} 位校友发送更新提醒！` });
      setSelectedAlumni([]);
      loadDashboard();
      loadAlumniWithoutUpdates();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '批量发送提醒失败' 
      });
    }
  };

  const handleConfirmUpdate = async (userId, userName) => {
    if (!window.confirm(`确认 ${userName} 已完成信息更新？`)) {
      return;
    }

    try {
      await adminAPI.confirmUpdate(userId);
      setMessage({ type: 'success', text: '已确认更新完成！' });
      loadDashboard();
      if (activeTab === 'reminders') {
        loadReminders();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '确认更新失败' 
      });
    }
  };

  const toggleSelectAlumni = (userId) => {
    setSelectedAlumni((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const toggleSelectAll = () => {
    if (selectedAlumni.length === alumniWithoutUpdates.length) {
      setSelectedAlumni([]);
    } else {
      setSelectedAlumni(alumniWithoutUpdates.map((a) => a.id));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '从未更新';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <h1 style={{ marginBottom: '1rem' }}>管理后台</h1>

          {message && (
            <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem' }}>
              {message.text}
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{dashboard?.statistics?.totalAlumni || 0}</div>
              <div className="stat-label">校友总数</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{dashboard?.statistics?.pendingReminders || 0}</div>
              <div className="stat-label">待确认更新</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{dashboard?.statistics?.completedReminders || 0}</div>
              <div className="stat-label">已完成更新</div>
            </div>
          </div>

          <div className="search-filters" style={{ marginBottom: '1rem', padding: '0' }}>
            <div className="nav-links" style={{ margin: 0, padding: '0.5rem 1rem', background: '#f8f9fa' }}>
              <button
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => setActiveTab('overview')}
              >
                概览
              </button>
              <button
                className={`nav-link ${activeTab === 'reminders' ? 'active' : ''}`}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => setActiveTab('reminders')}
              >
                提醒记录
              </button>
              <button
                className={`nav-link ${activeTab === 'send-reminders' ? 'active' : ''}`}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => setActiveTab('send-reminders')}
              >
                发送提醒
              </button>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="profile-details">
              <h3 style={{ marginBottom: '1rem' }}>按届别分布</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginBottom: '2rem' }}>
                {dashboard?.yearStats?.map((stat) => (
                  <div key={stat.graduation_year} className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-number" style={{ fontSize: '1.5rem' }}>{stat.count}</div>
                    <div className="stat-label">{stat.graduation_year}届</div>
                  </div>
                ))}
              </div>

              <h3 style={{ marginBottom: '1rem' }}>按城市分布 (Top 10)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginBottom: '2rem' }}>
                {dashboard?.cityStats?.map((stat) => (
                  <div key={stat.city} className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-number" style={{ fontSize: '1.5rem' }}>{stat.count}</div>
                    <div className="stat-label">{stat.city}</div>
                  </div>
                ))}
              </div>

              <h3 style={{ marginBottom: '1rem' }}>按行业分布 (Top 10)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {dashboard?.industryStats?.map((stat) => (
                  <div key={stat.industry} className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-number" style={{ fontSize: '1.5rem' }}>{stat.count}</div>
                    <div className="stat-label">{stat.industry}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>目标校友</th>
                    <th>邮箱</th>
                    <th>发送人</th>
                    <th>状态</th>
                    <th>发送时间</th>
                    <th>完成时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                        暂无提醒记录
                      </td>
                    </tr>
                  ) : (
                    reminders.map((reminder) => (
                      <tr key={reminder.id}>
                        <td>{reminder.target_name}</td>
                        <td>{reminder.target_email}</td>
                        <td>{reminder.admin_name}</td>
                        <td>
                          {reminder.status === 'pending' ? (
                            <span className="reminder-badge">待确认</span>
                          ) : (
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>已完成</span>
                          )}
                        </td>
                        <td>{formatDate(reminder.created_at)}</td>
                        <td>{reminder.completed_at ? formatDate(reminder.completed_at) : '-'}</td>
                        <td>
                          {reminder.status === 'pending' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                              onClick={() => handleConfirmUpdate(reminder.target_user_id, reminder.target_name)}
                            >
                              确认完成
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'send-reminders' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ color: '#666' }}>
                  以下校友超过 180 天未更新信息，可向他们发送更新提醒
                </p>
                {selectedAlumni.length > 0 && (
                  <button className="btn btn-primary" onClick={handleBatchSendReminders}>
                    向选中的 {selectedAlumni.length} 位校友发送提醒
                  </button>
                )}
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>
                        <input
                          type="checkbox"
                          checked={selectedAlumni.length === alumniWithoutUpdates.length && alumniWithoutUpdates.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>姓名</th>
                      <th>毕业年份</th>
                      <th>城市</th>
                      <th>行业</th>
                      <th>公司</th>
                      <th>最后更新</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumniWithoutUpdates.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                          所有校友都已及时更新信息！
                        </td>
                      </tr>
                    ) : (
                      alumniWithoutUpdates.map((alumni) => (
                        <tr key={alumni.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedAlumni.includes(alumni.id)}
                              onChange={() => toggleSelectAlumni(alumni.id)}
                            />
                          </td>
                          <td>{alumni.name}</td>
                          <td>{alumni.graduation_year}</td>
                          <td>{alumni.city || '-'}</td>
                          <td>{alumni.industry || '-'}</td>
                          <td>{alumni.company || '-'}</td>
                          <td>{formatDate(alumni.last_updated)}</td>
                          <td>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                              onClick={() => handleSendReminder(alumni.id, alumni.name)}
                            >
                              发送提醒
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
