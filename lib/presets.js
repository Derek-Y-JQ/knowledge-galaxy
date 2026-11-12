// knowledge-galaxy one-click category packs (管理类目 → 导入预设).
// Importing a pack creates ordinary custom categories in the chosen mode, so
// they stay fully editable afterwards. Pure data.

export const PRESET_PACKS = [
  {
    id: 'ai-cs',
    name: 'AI 与计算机科学',
    description: '大模型、机器学习工程、编程与系统',
    suggestedMode: 'study',
    categories: [
      {
        name: '人工智能', en: 'Artificial Intelligence', color: '#a78bfa', glyph: '🤖',
        subcategories: [
          { name: '大语言模型', keywords: ['大语言模型', 'LLM', 'GPT', 'Transformer', '提示词', 'prompt', '微调', 'RAG', '预训练'] },
          { name: '智能体与多智能体', keywords: ['智能体', 'agent', '多智能体', 'multi-agent', '工具调用', 'tool use', '规划'] },
          { name: '机器学习工程', keywords: ['训练', '推理', '数据集', '评测', 'benchmark', 'MLOps', '蒸馏', '量化'] },
          { name: '计算机视觉与多模态', keywords: ['计算机视觉', '图像', '多模态', 'diffusion', 'CLIP', '视频生成'] },
        ],
      },
      {
        name: '计算机科学', en: 'Computer Science', color: '#60a5fa', glyph: '⌘',
        subcategories: [
          { name: '编程语言', keywords: ['Python', 'JavaScript', 'TypeScript', 'Rust', 'C++', 'Swift', '语法', '类型系统'] },
          { name: '数据结构与算法', keywords: ['数据结构', '算法', '动态规划', '图论', '排序', '复杂度', 'LeetCode'] },
          { name: '系统与网络', keywords: ['操作系统', '数据库', '分布式', '网络', 'Linux', 'Docker', 'HTTP', '并发'] },
          { name: '软件工程', keywords: ['软件工程', '架构', '设计模式', '测试', 'Git', '代码审查', '重构'] },
        ],
      },
    ],
  },
  {
    id: 'finance',
    name: '金融与投资研究',
    description: '宏观、权益、资产配置与公司研究',
    suggestedMode: 'daily',
    categories: [
      {
        name: '金融研究', en: 'Finance', color: '#facc15', glyph: '💹',
        subcategories: [
          { name: '宏观经济', keywords: ['宏观', '通胀', '利率', '美联储', '央行', 'GDP', '就业', '汇率', '货币政策'] },
          { name: '股票与行业', keywords: ['股票', '美股', 'A股', '港股', '财报', '估值', '行业', '市盈率', '复盘'] },
          { name: '资产配置', keywords: ['资产配置', '投资组合', '基金', 'ETF', '债券', '风险', '夏普', '再平衡'] },
          { name: '量化与衍生品', keywords: ['量化', '因子', '回测', '期权', '期货', '波动率', '对冲'] },
          { name: '个人理财', keywords: ['理财', '预算', '储蓄', '保险', '税', '养老金', '房贷'] },
        ],
      },
    ],
  },
  {
    id: 'health',
    name: '健康与健身管理',
    description: '训练、营养、睡眠与日常健康',
    suggestedMode: 'daily',
    categories: [
      {
        name: '健康与健身', en: 'Health & Fitness', color: '#34d399', glyph: '💪',
        subcategories: [
          { name: '力量训练', keywords: ['力量训练', '深蹲', '卧推', '硬拉', '增肌', '训练计划', '组数', '渐进超负荷'] },
          { name: '有氧与体能', keywords: ['有氧', '跑步', '心率', '配速', '游泳', '骑行', 'HIIT', '耐力'] },
          { name: '饮食营养', keywords: ['饮食', '营养', '蛋白质', '碳水', '热量', '减脂', '食谱', '补剂'] },
          { name: '睡眠与恢复', keywords: ['睡眠', '恢复', '拉伸', '作息', '疲劳', '放松'] },
          { name: '健康咨询', keywords: ['体检', '症状', '就医', '用药', '疼痛', '姿势', '久坐'] },
        ],
      },
    ],
  },
]

export function findPresetPack(id) {
  return PRESET_PACKS.find((pack) => pack.id === id)
}

/** Compact listing for GET /state. */
export function presetPackSummaries() {
  return PRESET_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    suggestedMode: pack.suggestedMode,
    categories: pack.categories.map((category) => ({
      name: category.name,
      glyph: category.glyph,
      color: category.color,
      subcategories: category.subcategories.map((subcategory) => subcategory.name),
    })),
  }))
}
