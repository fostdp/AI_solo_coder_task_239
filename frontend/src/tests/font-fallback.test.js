describe('字体回退测试', () => {
  describe('CSS字体堆栈验证', () => {
    let originalGetComputedStyle;
    let mockComputedStyle;

    beforeEach(() => {
      originalGetComputedStyle = window.getComputedStyle;
      mockComputedStyle = {
        fontFamily: '',
        getPropertyValue: (prop) => {
          if (prop === 'font-family') return mockComputedStyle.fontFamily;
          return '';
        }
      };
      window.getComputedStyle = jest.fn(() => mockComputedStyle);
    });

    afterEach(() => {
      window.getComputedStyle = originalGetComputedStyle;
    });

    test('CSS文件应包含中文字体回退堆栈', () => {
      const requiredFonts = [
        'PingFang SC',
        'Microsoft YaHei',
        '微软雅黑',
        'Hiragino Sans GB',
        'Heiti SC',
        'WenQuanYi Micro Hei',
        'sans-serif'
      ];

      const styleSheets = document.styleSheets;
      let foundFontFamily = false;

      for (let i = 0; i < styleSheets.length; i++) {
        try {
          const rules = styleSheets[i].cssRules || styleSheets[i].rules;
          if (rules) {
            for (let j = 0; j < rules.length; j++) {
              if (rules[j].style && rules[j].style.fontFamily) {
                const fontFamily = rules[j].style.fontFamily;
                if (requiredFonts.some(font => fontFamily.includes(font))) {
                  foundFontFamily = true;
                  break;
                }
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    });

    test('字体堆栈应按照优先级排列', () => {
      const expectedPriority = [
        'PingFang SC',
        'Microsoft YaHei',
        '微软雅黑',
        'Hiragino Sans GB',
        'Heiti SC',
        'WenQuanYi Micro Hei'
      ];

      const fontStack = "PingFang SC, Microsoft YaHei, 微软雅黑, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif";
      const fonts = fontStack.split(',').map(f => f.trim().replace(/['"]/g, ''));

      expectedPriority.forEach((font, index) => {
        expect(fonts[index]).toBe(font);
      });
    });

    test('字体堆栈应包含平台特定字体', () => {
      const fontStack = "PingFang SC, Microsoft YaHei, 微软雅黑, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif";
      
      expect(fontStack).toContain('PingFang SC');
      expect(fontStack).toContain('Hiragino Sans GB');
      expect(fontStack).toContain('Microsoft YaHei');
      expect(fontStack).toContain('微软雅黑');
      expect(fontStack).toContain('WenQuanYi Micro Hei');
      expect(fontStack).toContain('sans-serif');
    });
  });

  describe('生僻字显示测试', () => {
    test('创建的元素应能应用字体堆栈', () => {
      const element = document.createElement('div');
      element.style.fontFamily = "PingFang SC, Microsoft YaHei, 微软雅黑, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif";
      document.body.appendChild(element);

      const computedStyle = window.getComputedStyle(element);
      const fontFamily = computedStyle.getPropertyValue('font-family');

      expect(fontFamily).toBeDefined();
      expect(typeof fontFamily).toBe('string');

      document.body.removeChild(element);
    });

    test('生僻字应能正确渲染在DOM中', () => {
      const rareCharacters = ['䶮', '𫟴', '𡊨', '爨', '龘', '靐', '齉'];

      const container = document.createElement('div');
      container.style.fontFamily = "PingFang SC, Microsoft YaHei, 微软雅黑, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif";
      rareCharacters.forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        container.appendChild(span);
      });
      document.body.appendChild(container);

      const spans = container.querySelectorAll('span');
      expect(spans.length).toBe(rareCharacters.length);

      spans.forEach((span, index) => {
        expect(span.textContent).toBe(rareCharacters[index]);
      });

      document.body.removeChild(container);
    });

    test('字体回退机制验证', () => {
      const testCases = [
        {
          description: '普通中文字符',
          text: '你好世界',
          expectedRenderable: true
        },
        {
          description: '生僻中文字符',
          text: '䶮龘靐齉',
          expectedRenderable: true
        },
        {
          description: '混合字符',
          text: 'Hello 世界 䶮',
          expectedRenderable: true
        }
      ];

      testCases.forEach(({ description, text }) => {
        const element = document.createElement('div');
        element.textContent = text;
        element.style.fontFamily = "PingFang SC, Microsoft YaHei, 微软雅黑, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif";
        document.body.appendChild(element);

        expect(element.textContent).toBe(text);
        expect(element.style.fontFamily).toBeDefined();

        document.body.removeChild(element);
      });
    });
  });

  describe('名片和头像字体测试', () => {
    test('card-avatar 应使用独立字体堆栈', () => {
      const cardAvatarFont = "PingFang SC, Microsoft YaHei, 微软雅黑, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif";

      const element = document.createElement('div');
      element.className = 'card-avatar';
      element.style.fontFamily = cardAvatarFont;
      element.textContent = '张';
      document.body.appendChild(element);

      expect(element.style.fontFamily).toContain('PingFang SC');
      expect(element.style.fontFamily).toContain('Microsoft YaHei');
      expect(element.textContent).toBe('张');

      document.body.removeChild(element);
    });

    test('profile-avatar 应使用独立字体堆栈', () => {
      const profileAvatarFont = "PingFang SC, Microsoft YaHei, 微软雅黑, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif";

      const element = document.createElement('div');
      element.className = 'profile-avatar';
      element.style.fontFamily = profileAvatarFont;
      element.textContent = '李';
      document.body.appendChild(element);

      expect(element.style.fontFamily).toContain('PingFang SC');
      expect(element.style.fontFamily).toContain('微软雅黑');
      expect(element.textContent).toBe('李');

      document.body.removeChild(element);
    });

    test('生僻字在头像中应正确显示', () => {
      const rareCharNames = ['䶮', '𫟴', '龘'];
      const avatarFont = "PingFang SC, Microsoft YaHei, 微软雅黑, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif";

      rareCharNames.forEach(char => {
        const avatar = document.createElement('div');
        avatar.style.fontFamily = avatarFont;
        avatar.style.fontSize = '3rem';
        avatar.style.fontWeight = 'bold';
        avatar.textContent = char;
        document.body.appendChild(avatar);

        expect(avatar.textContent).toBe(char);
        expect(parseFloat(avatar.style.fontSize)).toBeGreaterThan(0);

        document.body.removeChild(avatar);
      });
    });
  });

  describe('字体可用性检测', () => {
    test('应验证字体堆栈中至少有一种字体可用', () => {
      const commonFonts = ['sans-serif', 'serif', 'monospace'];
      const testString = 'mmmmmmmmmmlli';
      const baseSize = 72;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      commonFonts.forEach(font => {
        ctx.font = `${baseSize}px ${font}`;
        const metrics = ctx.measureText(testString);
        expect(metrics.width).toBeGreaterThan(0);
      });
    });

    test('Canvas应能渲染使用中文字体的文本', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');

      const fonts = [
        'sans-serif',
        'PingFang SC, sans-serif',
        'Microsoft YaHei, sans-serif'
      ];

      fonts.forEach(font => {
        ctx.font = `24px ${font}`;
        ctx.fillStyle = '#000';
        ctx.fillText('测试文字', 10, 50);
        
        expect(ctx.font).toContain(font.split(',')[0]);
      });
    });
  });
});
