import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { alumniAPI } from '../services/api';

const AlumniDetail = () => {
  const { id } = useParams();
  const [alumni, setAlumni] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlumni = async () => {
      try {
        const response = await alumniAPI.getById(id);
        setAlumni(response.data);
      } catch (error) {
        console.error('加载校友详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlumni();
  }, [id]);

  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!alumni) {
    return (
      <div>
        <Navbar />
        <div className="container main-content">
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>校友不存在</p>
            <Link to="/alumni" className="btn btn-primary">
              返回名片墙
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div className="profile-container">
            <Link to="/alumni" className="btn btn-outline" style={{ marginBottom: '1rem' }}>
              ← 返回名片墙
            </Link>
            
            <div className="profile-header">
              <div className="profile-avatar">{getInitials(alumni.name)}</div>
              <h1 className="profile-name">{alumni.name}</h1>
              <p className="profile-position">
                {alumni.position || '职位未填写'}
                {alumni.company && ` @ ${alumni.company}`}
              </p>
              <div style={{ marginTop: '1rem' }}>
                {alumni.graduation_year && (
                  <span className="card-tag">{alumni.graduation_year}届</span>
                )}
                {alumni.major && (
                  <span className="card-tag">{alumni.major}</span>
                )}
                {alumni.city && (
                  <span className="card-tag">📍 {alumni.city}</span>
                )}
                {alumni.industry && (
                  <span className="card-tag">🏭 {alumni.industry}</span>
                )}
              </div>
            </div>

            <div className="profile-details">
              <h3 style={{ marginBottom: '1rem' }}>基本信息</h3>
              
              {alumni.canViewContact ? (
                <>
                  <div className="detail-item">
                    <div className="detail-label">邮箱</div>
                    <div className="detail-value">{alumni.email}</div>
                  </div>
                  
                  <div className="detail-item">
                    <div className="detail-label">电话</div>
                    <div className="detail-value">{alumni.phone || '未填写'}</div>
                  </div>
                </>
              ) : (
                <div className="alert alert-warning">
                  🔒 联系方式（邮箱、电话）仅对管理员和校友本人可见
                </div>
              )}
              
              <div className="detail-item">
                <div className="detail-label">公司</div>
                <div className="detail-value">{alumni.company || '未填写'}</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">职位</div>
                <div className="detail-value">{alumni.position || '未填写'}</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">城市</div>
                <div className="detail-value">{alumni.city || '未填写'}</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">行业</div>
                <div className="detail-value">{alumni.industry || '未填写'}</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">专业</div>
                <div className="detail-value">{alumni.major || '未填写'}</div>
              </div>
              
              {alumni.canViewContact && (
                <div className="detail-item">
                  <div className="detail-label">个人简介</div>
                  <div className="detail-value">{alumni.bio || '未填写'}</div>
                </div>
              )}
              
              <div className="detail-item">
                <div className="detail-label">最后更新</div>
                <div className="detail-value">
                  {alumni.last_updated ? new Date(alumni.last_updated).toLocaleString() : '从未更新'}
                </div>
              </div>

              {alumni.update_reminder_status === 'pending' && (
                <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                  该校友有待确认的信息更新
                </div>
              )}
            </div>

            {alumni.canViewContact && alumni.jobChanges && alumni.jobChanges.length > 0 && (
              <div className="profile-details" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>工作变动记录</h3>
                {alumni.jobChanges.map((change, index) => (
                  <div key={change.id} className="detail-item">
                    <div className="detail-label">变动 #{index + 1}</div>
                    <div className="detail-value">
                      <div>
                        <strong>从：</strong>
                        {change.previous_position || '职位未记录'}
                        {change.previous_company && ` @ ${change.previous_company}`}
                      </div>
                      <div>
                        <strong>到：</strong>
                        {change.new_position || '职位未记录'}
                        {change.new_company && ` @ ${change.new_company}`}
                      </div>
                      <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        {change.change_date 
                          ? `变动时间: ${new Date(change.change_date).toLocaleDateString()}`
                          : `记录时间: ${new Date(change.created_at).toLocaleDateString()}`
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AlumniDetail;
