import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { alumniAPI } from '../services/api';

const MyProfile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    graduation_year: '',
    major: '',
    city: '',
    industry: '',
    company: '',
    position: '',
    phone: '',
    bio: '',
    email_opt_out: 0,
  });

  const [showJobChangeModal, setShowJobChangeModal] = useState(false);
  const [jobChangeData, setJobChangeData] = useState({
    previous_company: '',
    previous_position: '',
    new_company: '',
    new_position: '',
    change_date: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await alumniAPI.getMe();
        const data = response.data;
        setProfile(data);
        setFormData({
          graduation_year: data.profile?.graduation_year || '',
          major: data.profile?.major || '',
          city: data.profile?.city || '',
          industry: data.profile?.industry || '',
          company: data.profile?.company || '',
          position: data.profile?.position || '',
          phone: data.profile?.phone || '',
          bio: data.profile?.bio || '',
          email_opt_out: data.profile?.email_opt_out || 0,
        });
      } catch (error) {
        console.error('加载个人资料失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleJobChangeChange = (e) => {
    const { name, value } = e.target;
    setJobChangeData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await alumniAPI.updateMe(formData);
      updateUser(response.data.user);
      setProfile(response.data.user);
      setMessage({ type: 'success', text: '资料更新成功！' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '更新失败，请重试' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleJobChangeSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await alumniAPI.addJobChange(jobChangeData);
      
      if (jobChangeData.new_company || jobChangeData.new_position) {
        await alumniAPI.updateMe({
          company: jobChangeData.new_company || formData.company,
          position: jobChangeData.new_position || formData.position,
        });
      }

      setShowJobChangeModal(false);
      setJobChangeData({
        previous_company: '',
        previous_position: '',
        new_company: '',
        new_position: '',
        change_date: '',
      });
      setMessage({ type: 'success', text: '工作变动记录已添加！' });
      
      const response = await alumniAPI.getMe();
      setProfile(response.data);
      setFormData((prev) => ({
        ...prev,
        company: response.data.profile?.company || prev.company,
        position: response.data.profile?.position || prev.position,
      }));
      updateUser(response.data);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '添加工作变动失败，请重试' 
      });
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div className="profile-container">
            {message && (
              <div className={`alert alert-${message.type}`}>
                {message.text}
              </div>
            )}

            {profile?.profile?.update_reminder_status === 'pending' && (
              <div className="alert alert-warning">
                ⚠️ 管理员发起了信息更新提醒，请及时更新您的个人信息！
              </div>
            )}

            <div className="profile-header">
              <div className="profile-avatar">{getInitials(user?.name || 'U')}</div>
              <h1 className="profile-name">{user?.name}</h1>
              <p className="profile-position">
                {profile?.profile?.position || '职位未填写'}
                {profile?.profile?.company && ` @ ${profile?.profile?.company}`}
              </p>
              <p style={{ color: '#888', marginTop: '0.5rem' }}>{user?.email}</p>
            </div>

            <div className="profile-details">
              <h3 style={{ marginBottom: '1rem' }}>编辑个人信息</h3>
              <form onSubmit={handleSubmit}>
                <div className="search-row">
                  <div className="form-group">
                    <label className="form-label">毕业年份 *</label>
                    <select
                      name="graduation_year"
                      className="form-select"
                      value={formData.graduation_year}
                      onChange={handleChange}
                      required
                    >
                      <option value="">请选择</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">专业</label>
                    <input
                      type="text"
                      name="major"
                      className="form-input"
                      value={formData.major}
                      onChange={handleChange}
                      placeholder="请输入专业"
                    />
                  </div>
                </div>

                <div className="search-row">
                  <div className="form-group">
                    <label className="form-label">所在城市</label>
                    <input
                      type="text"
                      name="city"
                      className="form-input"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="请输入城市"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">所属行业</label>
                    <input
                      type="text"
                      name="industry"
                      className="form-input"
                      value={formData.industry}
                      onChange={handleChange}
                      placeholder="请输入行业"
                    />
                  </div>
                </div>

                <div className="search-row">
                  <div className="form-group">
                    <label className="form-label">公司</label>
                    <input
                      type="text"
                      name="company"
                      className="form-input"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="请输入公司名称"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">职位</label>
                    <input
                      type="text"
                      name="position"
                      className="form-input"
                      value={formData.position}
                      onChange={handleChange}
                      placeholder="请输入职位"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">联系电话</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="请输入电话号码"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">个人简介</label>
                  <textarea
                    name="bio"
                    className="form-textarea"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="简单介绍一下自己..."
                  />
                </div>

                <div className="form-group" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '6px' }}>
                  <label className="form-label" style={{ marginBottom: '0.5rem' }}>
                    更新提醒设置
                  </label>
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="email_opt_out"
                      name="email_opt_out"
                      checked={formData.email_opt_out === 1}
                      onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        email_opt_out: e.target.checked ? 1 : 0
                      }))}
                    />
                    <label htmlFor="email_opt_out" style={{ margin: 0, fontWeight: 'normal' }}>
                      退订管理员的信息更新提醒（开启后将不再收到更新通知）
                    </label>
                  </div>
                </div>

                <div className="search-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? '保存中...' : '保存修改'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowJobChangeModal(true)}
                  >
                    记录工作变动
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {showJobChangeModal && (
        <div className="modal-overlay" onClick={() => setShowJobChangeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">记录工作变动</h3>
              <button
                className="modal-close"
                onClick={() => setShowJobChangeModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleJobChangeSubmit}>
              <h4 style={{ marginBottom: '1rem' }}>原工作信息</h4>
              <div className="search-row">
                <div className="form-group">
                  <label className="form-label">原公司</label>
                  <input
                    type="text"
                    name="previous_company"
                    className="form-input"
                    value={jobChangeData.previous_company}
                    onChange={handleJobChangeChange}
                    placeholder="原公司名称"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">原职位</label>
                  <input
                    type="text"
                    name="previous_position"
                    className="form-input"
                    value={jobChangeData.previous_position}
                    onChange={handleJobChangeChange}
                    placeholder="原职位"
                  />
                </div>
              </div>

              <h4 style={{ marginBottom: '1rem', marginTop: '1rem' }}>新工作信息</h4>
              <div className="search-row">
                <div className="form-group">
                  <label className="form-label">新公司</label>
                  <input
                    type="text"
                    name="new_company"
                    className="form-input"
                    value={jobChangeData.new_company}
                    onChange={handleJobChangeChange}
                    placeholder="新公司名称"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">新职位</label>
                  <input
                    type="text"
                    name="new_position"
                    className="form-input"
                    value={jobChangeData.new_position}
                    onChange={handleJobChangeChange}
                    placeholder="新职位"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">变动日期</label>
                <input
                  type="date"
                  name="change_date"
                  className="form-input"
                  value={jobChangeData.change_date}
                  onChange={handleJobChangeChange}
                />
              </div>

              <div className="search-actions">
                <button type="submit" className="btn btn-primary">
                  确认记录
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowJobChangeModal(false)}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
