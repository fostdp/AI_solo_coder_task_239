const request = require('supertest');
const { initTestDb, createAdminUser, createAlumniUser, generateToken } = require('./utils/test-helpers');
const createTestApp = require('./utils/test-app');
const fs = require('fs');
const path = require('path');

describe('搜索容错和权限校验测试', () => {
  let app;
  let db;
  let adminUser;
  let alumniUser1;
  let alumniUser2;
  let optOutUser;
  let adminToken;
  let alumniToken1;
  let alumniToken2;

  beforeAll(() => {
    db = initTestDb();
    app = createTestApp();

    adminUser = createAdminUser(db);
    alumniUser1 = createAlumniUser(db, {
      name: '张三',
      email: 'zhangsan@test.com',
      graduation_year: 2020,
      city: '北京',
      industry: '互联网'
    });
    alumniUser2 = createAlumniUser(db, {
      name: '李四',
      email: 'lisi@test.com',
      graduation_year: 2019,
      city: '上海',
      industry: '金融'
    });
    optOutUser = createAlumniUser(db, {
      name: '王五',
      email: 'wangwu@test.com',
      graduation_year: 2018,
      city: '广州',
      industry: '教育',
      email_opt_out: 1
    });

    adminToken = generateToken(adminUser);
    alumniToken1 = generateToken(alumniUser1);
    alumniToken2 = generateToken(alumniUser2);
  });

  afterAll(() => {
    if (app && app.closeDb) {
      app.closeDb();
    }
  });

  describe('搜索容错测试', () => {
    describe('空值搜索测试', () => {
      test('空字符串行业参数不应导致SQL异常，应返回所有结果', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({ industry: '' })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body).toHaveProperty('alumni');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.alumni)).toBe(true);
        expect(response.body.alumni.length).toBeGreaterThanOrEqual(3);
      });

      test('只包含空格的城市参数不应导致SQL异常', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({ city: '   ' })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body).toHaveProperty('alumni');
        expect(Array.isArray(response.body.alumni)).toBe(true);
        expect(response.body.alumni.length).toBeGreaterThanOrEqual(3);
      });

      test('所有搜索参数都为空时应返回所有校友', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({
            graduation_year: '',
            city: '',
            industry: '',
            name: ''
          })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body).toHaveProperty('alumni');
        expect(response.body.alumni.length).toBeGreaterThanOrEqual(3);
      });

      test('无效的毕业年份参数（非数字）应被忽略', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({ graduation_year: 'abc' })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body).toHaveProperty('alumni');
        expect(response.body.alumni.length).toBeGreaterThanOrEqual(3);
      });

      test('混合正常和空值参数应正常工作', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({
            name: '张三',
            city: '',
            industry: null,
            graduation_year: undefined
          })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body).toHaveProperty('alumni');
        const zhangsan = response.body.alumni.find(a => a.name === '张三');
        expect(zhangsan).toBeDefined();
      });
    });

    describe('正常搜索功能验证', () => {
      test('按城市搜索应返回正确结果', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({ city: '北京' })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.alumni.length).toBe(1);
        expect(response.body.alumni[0].name).toBe('张三');
        expect(response.body.alumni[0].city).toBe('北京');
      });

      test('按行业搜索应返回正确结果', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({ industry: '金融' })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.alumni.length).toBe(1);
        expect(response.body.alumni[0].name).toBe('李四');
        expect(response.body.alumni[0].industry).toBe('金融');
      });

      test('按毕业年份搜索应返回正确结果', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({ graduation_year: 2020 })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.alumni.length).toBe(1);
        expect(response.body.alumni[0].name).toBe('张三');
        expect(response.body.alumni[0].graduation_year).toBe(2020);
      });

      test('按姓名模糊搜索应返回正确结果', async () => {
        const response = await request(app)
          .get('/api/alumni/list')
          .query({ name: '三' })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.alumni.length).toBe(1);
        expect(response.body.alumni[0].name).toBe('张三');
      });
    });
  });

  describe('退订过滤测试', () => {
    test('管理员尝试向已退订用户发送单个提醒应被拒绝', async () => {
      const response = await request(app)
        .post('/api/admin/send-reminder')
        .send({ target_user_id: optOutUser.id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toContain('退订');
    });

    test('管理员向未退订用户发送单个提醒应成功', async () => {
      const response = await request(app)
        .post('/api/admin/send-reminder')
        .send({ target_user_id: alumniUser2.id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('已发送');
      expect(response.body.targetUser.name).toBe('李四');
    });

    test('批量发送提醒时应跳过已退订用户', async () => {
      const response = await request(app)
        .post('/api/admin/send-batch-reminders')
        .send({
          target_user_ids: [alumniUser1.id, optOutUser.id]
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.sentCount).toBe(1);
      expect(response.body.optOutCount).toBe(1);
      expect(response.body.message).toContain('跳过');
    });

    test('批量发送提醒给全部退订用户应返回错误', async () => {
      const response = await request(app)
        .post('/api/admin/send-batch-reminders')
        .send({
          target_user_ids: [optOutUser.id]
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.optOutCount).toBe(1);
    });

    test('校友可以设置退订状态', async () => {
      const response = await request(app)
        .put('/api/alumni/me')
        .send({ email_opt_out: 1 })
        .set('Authorization', `Bearer ${alumniToken1}`)
        .expect(200);

      expect(response.body.user.profile.email_opt_out).toBe(1);
    });

    test('校友可以取消退订状态', async () => {
      const response = await request(app)
        .put('/api/alumni/me')
        .send({ email_opt_out: 0 })
        .set('Authorization', `Bearer ${alumniToken1}`)
        .expect(200);

      expect(response.body.user.profile.email_opt_out).toBe(0);
    });
  });

  describe('隐私字段保护测试', () => {
    describe('校友查看自己的详情', () => {
      test('校友查看自己的详情应能看到所有联系方式', async () => {
        const response = await request(app)
          .get(`/api/alumni/${alumniUser1.id}`)
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.canViewContact).toBe(true);
        expect(response.body.email).toBe('zhangsan@test.com');
        expect(response.body.phone).toBeDefined();
        expect(response.body.bio).toBeDefined();
        expect(response.body.jobChanges).toBeDefined();
      });
    });

    describe('管理员查看校友详情', () => {
      test('管理员查看校友详情应能看到所有联系方式', async () => {
        const response = await request(app)
          .get(`/api/alumni/${alumniUser2.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.canViewContact).toBe(true);
        expect(response.body.email).toBe('lisi@test.com');
        expect(response.body.phone).toBeDefined();
        expect(response.body.bio).toBeDefined();
        expect(response.body.jobChanges).toBeDefined();
      });
    });

    describe('其他校友查看校友详情', () => {
      test('其他校友查看校友详情不应看到邮箱', async () => {
        const response = await request(app)
          .get(`/api/alumni/${alumniUser2.id}`)
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.canViewContact).toBe(false);
        expect(response.body.email).toBeUndefined();
      });

      test('其他校友查看校友详情不应看到电话', async () => {
        const response = await request(app)
          .get(`/api/alumni/${alumniUser2.id}`)
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.canViewContact).toBe(false);
        expect(response.body.phone).toBeUndefined();
      });

      test('其他校友查看校友详情不应看到个人简介', async () => {
        const response = await request(app)
          .get(`/api/alumni/${alumniUser2.id}`)
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.canViewContact).toBe(false);
        expect(response.body.bio).toBeUndefined();
      });

      test('其他校友查看校友详情不应看到工作变动记录', async () => {
        const response = await request(app)
          .get(`/api/alumni/${alumniUser2.id}`)
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.canViewContact).toBe(false);
        expect(response.body.jobChanges).toEqual([]);
      });

      test('其他校友查看校友详情应能看到公开信息', async () => {
        const response = await request(app)
          .get(`/api/alumni/${alumniUser2.id}`)
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(200);

        expect(response.body.name).toBe('李四');
        expect(response.body.graduation_year).toBe(2019);
        expect(response.body.city).toBe('上海');
        expect(response.body.industry).toBe('金融');
        expect(response.body.company).toBeDefined();
        expect(response.body.position).toBeDefined();
      });
    });

    describe('未授权访问', () => {
      test('无Token访问校友列表应返回401', async () => {
        await request(app)
          .get('/api/alumni/list')
          .expect(401);
      });

      test('无效Token访问校友详情应返回403', async () => {
        await request(app)
          .get(`/api/alumni/${alumniUser1.id}`)
          .set('Authorization', 'Bearer invalid_token')
          .expect(403);
      });

      test('校友访问管理员接口应返回403', async () => {
        await request(app)
          .post('/api/admin/send-reminder')
          .send({ target_user_id: alumniUser2.id })
          .set('Authorization', `Bearer ${alumniToken1}`)
          .expect(403);
      });
    });
  });

  describe('综合测试', () => {
    test('完整的退订流程测试', async () => {
      const newAlumni = createAlumniUser(db, {
        name: '赵六',
        email: 'zhaoliu@test.com'
      });
      const newToken = generateToken(newAlumni);

      const response1 = await request(app)
        .post('/api/admin/send-reminder')
        .send({ target_user_id: newAlumni.id })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .put('/api/alumni/me')
        .send({ email_opt_out: 1 })
        .set('Authorization', `Bearer ${newToken}`);
      expect(response2.body.user.profile.email_opt_out).toBe(1);

      const response3 = await request(app)
        .post('/api/admin/send-reminder')
        .send({ target_user_id: newAlumni.id })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response3.status).toBe(400);
      expect(response3.body.error).toContain('退订');

      const response4 = await request(app)
        .put('/api/alumni/me')
        .send({ email_opt_out: 0 })
        .set('Authorization', `Bearer ${newToken}`);
      expect(response4.body.user.profile.email_opt_out).toBe(0);

      const response5 = await request(app)
        .post('/api/admin/send-reminder')
        .send({ target_user_id: newAlumni.id })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response5.status).toBe(200);
    });

    test('混合搜索条件和权限的综合测试', async () => {
      const searchResponse = await request(app)
        .get('/api/alumni/list')
        .query({
          graduation_year: '',
          city: '',
          industry: '',
          name: ''
        })
        .set('Authorization', `Bearer ${alumniToken1}`)
        .expect(200);

      const foundAlumni = searchResponse.body.alumni.find(a => a.name === '李四');
      expect(foundAlumni).toBeDefined();

      const detailResponse = await request(app)
        .get(`/api/alumni/${foundAlumni.id}`)
        .set('Authorization', `Bearer ${alumniToken1}`)
        .expect(200);

      expect(detailResponse.body.canViewContact).toBe(false);
      expect(detailResponse.body.email).toBeUndefined();
      expect(detailResponse.body.name).toBe('李四');
    });
  });
});
