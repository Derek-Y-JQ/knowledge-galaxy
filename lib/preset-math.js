// knowledge-galaxy: built-in mathematics template for 学习模式 (4 categories, 27 subcategories).
// Pure data. Ids are frozen: they are persisted in user state.

export const MATH_PRESET_CATEGORIES = [
  {
    id: 'analysis',
    name: '分析学',
    en: 'Analysis',
    color: '#7aa2ff',
    glyph: '∫',
    subcategories: [
      {
        id: 'calculus',
        name: '微积分',
        en: 'Calculus',
        keywords: [
          '极限', '导数', '微分', '积分', '级数', '洛必达', '泰勒展开', '中值定理',
          'limit', 'derivative', 'integral', 'series', 'Taylor', 'Rolle',
        ],
      },
      {
        id: 'real-analysis',
        name: '实变函数',
        en: 'Real Analysis',
        keywords: [
          '实变函数', '勒贝格', '测度', '可测', 'Lp 空间', '黎曼积分', '收敛', '测度论',
          'Lebesgue', 'measure', 'measurable', 'Riemann', 'convergence', 'dominated convergence',
        ],
      },
      {
        id: 'complex-analysis',
        name: '复变函数',
        en: 'Complex Analysis',
        keywords: [
          '复变函数', '全纯', '解析函数', '留数', '柯西积分', '黎曼映射', '亚纯', '复平面',
          'holomorphic', 'analytic function', 'residue', 'conformal', 'Cauchy', 'meromorphic',
        ],
      },
      {
        id: 'functional-analysis',
        name: '泛函分析',
        en: 'Functional Analysis',
        keywords: [
          '泛函分析', 'Banach', '希尔伯特', '压缩映射', '不动点', '算子', '对偶空间', '弱收敛',
          'Hilbert', 'operator', 'fixed point', 'compact operator', 'weak topology',
          'Hahn-Banach', '谱定理',
        ],
      },
      {
        id: 'differential-equations',
        name: '微分方程',
        en: 'Differential Equations',
        keywords: [
          '微分方程', '常微分方程', '偏微分方程', 'ODE', 'PDE', '初始值问题', '边值问题',
          '解的存在性', 'Navier-Stokes', '热方程', '波动方程', '稳定性',
          'stability', 'elliptic', 'parabolic',
        ],
      },
      {
        id: 'harmonic-analysis',
        name: '调和分析',
        en: 'Harmonic Analysis',
        keywords: [
          '调和分析', '傅里叶', 'Fourier', '小波', '奇异积分', '卷积', '傅里叶变换', 'Hardy 空间',
          'Fourier transform', 'wavelet', 'Calderón', 'Littlewood', 'convolution', '频谱',
        ],
      },
    ],
  },
  {
    id: 'algebra-geometry',
    name: '代数与几何',
    en: 'Algebra & Geometry',
    color: '#ffb86b',
    glyph: '◇',
    subcategories: [
      {
        id: 'abstract-algebra',
        name: '抽象代数',
        en: 'Abstract Algebra',
        keywords: [
          '抽象代数', '群论', '环论', '域论', '伽罗瓦', '同态', '理想', '模',
          'group', 'ring', 'field', 'Galois', 'homomorphism', 'module', 'Sylow',
        ],
      },
      {
        id: 'linear-algebra',
        name: '线性代数',
        en: 'Linear Algebra',
        keywords: [
          '线性代数', '矩阵', '特征值', '行列式', '线性空间', '线性变换', '秩', '正交',
          'matrix', 'eigenvalue', 'determinant', 'vector space', 'singular value',
          'Jordan 标准形', '正交化',
        ],
      },
      {
        id: 'commutative-algebra',
        name: '交换代数',
        en: 'Commutative Algebra',
        keywords: [
          '交换代数', '诺特环', '素理想', '局部化', '张量积', '极大理想', '整扩张',
          'Noetherian', 'prime ideal', 'localization', 'tensor product', 'Cohen-Macaulay',
          'Hilbert basis', '环同态',
        ],
      },
      {
        id: 'algebraic-geometry',
        name: '代数几何',
        en: 'Algebraic Geometry',
        keywords: [
          '代数几何', '概形', '代数簇', '层', '上同调', '射影空间', '椭圆曲线',
          'scheme', 'sheaf', 'cohomology', 'projective variety', 'elliptic curve',
          'divisor', 'Grothendieck',
        ],
      },
      {
        id: 'differential-geometry',
        name: '微分几何',
        en: 'Differential Geometry',
        keywords: [
          '微分几何', '流形', '曲率', '联络', '黎曼度量', '测地线', '李群', '纤维丛',
          'manifold', 'curvature', 'connection', 'Riemannian metric', 'geodesic',
          'Lie group', 'fiber bundle',
        ],
      },
      {
        id: 'topology',
        name: '拓扑学',
        en: 'Topology',
        keywords: [
          '拓扑学', '同伦', '同调', '紧致', '连通', '开集', '基本群', '覆盖空间',
          'homotopy', 'homology', 'compact', 'connected', 'fundamental group',
          'CW complex', '同胚',
        ],
      },
    ],
  },
  {
    id: 'probability-statistics',
    name: '概率与统计',
    en: 'Probability & Statistics',
    color: '#6ee7b7',
    glyph: 'P',
    subcategories: [
      {
        id: 'probability',
        name: '概率论',
        en: 'Probability',
        keywords: [
          '概率论', '随机变量', '期望', '方差', '大数定律', '中心极限定理', '条件概率', '概率分布',
          'random variable', 'expectation', 'variance', 'law of large numbers',
          'central limit', 'conditional probability',
        ],
      },
      {
        id: 'mathematical-statistics',
        name: '数理统计',
        en: 'Mathematical Statistics',
        keywords: [
          '数理统计', '估计量', '充分统计量', '假设检验', '置信区间', '似然', '贝叶斯', '抽样',
          'estimator', 'sufficient statistic', 'hypothesis test', 'likelihood',
          'Bayesian', 'confidence interval', '抽样分布',
        ],
      },
      {
        id: 'stochastic-processes',
        name: '随机过程',
        en: 'Stochastic Processes',
        keywords: [
          '随机过程', '马尔可夫', '布朗运动', '泊松过程', '鞅', '平稳过程', '随机游走', '转移概率',
          'Markov', 'Brownian motion', 'Poisson process', 'martingale', 'random walk',
          'stationary process', 'Markov chain',
        ],
      },
      {
        id: 'stochastic-analysis',
        name: '随机分析',
        en: 'Stochastic Analysis',
        keywords: [
          '随机分析', '随机微分方程', 'Itô 积分', '伊藤', '随机积分', '扩散过程', 'Fokker-Planck', '随机微分',
          'stochastic differential equation', 'Ito integral', 'stochastic calculus',
          'diffusion', 'SDE', 'Itô',
        ],
      },
      {
        id: 'statistical-inference',
        name: '统计推断',
        en: 'Statistical Inference',
        keywords: [
          '统计推断', '参数估计', '最大似然', '最小二乘', '显著性', 'p 值', '假设检验', '区间估计',
          'inference', 'maximum likelihood', 'least squares', 'significance',
          'p-value', 'estimation', '检验统计量',
        ],
      },
      {
        id: 'high-dimensional-statistics',
        name: '高维统计',
        en: 'High-dimensional Statistics',
        keywords: [
          '高维统计', '维数灾难', '稀疏', 'Lasso', '正则化', '随机矩阵', '主成分', '变量选择',
          'high-dimensional', 'sparsity', 'random matrix', 'principal component',
          'ridge', 'feature selection', '压缩感知',
        ],
      },
    ],
  },
  {
    id: 'computation-optimization',
    name: '计算与优化',
    en: 'Computation & Optimization',
    color: '#c4b5fd',
    glyph: '∇',
    subcategories: [
      {
        id: 'numerical-analysis',
        name: '数值分析',
        en: 'Numerical Analysis',
        keywords: [
          '数值分析', '数值积分', '插值', '有限差分', '收敛阶', '数值稳定性', '牛顿法', '数值逼近',
          'numerical analysis', 'interpolation', 'finite difference', 'convergence order',
          'Runge-Kutta', 'Newton method', '误差界',
        ],
      },
      {
        id: 'optimization',
        name: '最优化',
        en: 'Optimization',
        keywords: [
          '最优化', '凸优化', '线性规划', '梯度下降', '对偶', 'KKT', '拉格朗日', '牛顿法',
          'optimization', 'convex optimization', 'gradient descent', 'duality',
          'Lagrange', 'KKT condition', '次梯度',
        ],
      },
      {
        id: 'operations-research',
        name: '运筹学',
        en: 'Operations Research',
        keywords: [
          '运筹学', '排队论', '库存', '网络流', '整数规划', '旅行商', '调度', '博弈论',
          'operations research', 'queueing', 'network flow', 'integer programming',
          'TSP', 'scheduling', 'game theory', 'linear programming',
        ],
      },
      {
        id: 'computational-mathematics',
        name: '计算数学',
        en: 'Computational Mathematics',
        keywords: [
          '计算数学', '复杂度', '有限元', '谱方法', '迭代法', '误差分析', '并行计算', '多重网格',
          'computational mathematics', 'finite element', 'spectral method',
          'iterative method', 'error analysis', 'multigrid', '预条件',
        ],
      },
      {
        id: 'algorithms-complexity',
        name: '算法与复杂度',
        en: 'Algorithms & Complexity',
        keywords: [
          '算法', '复杂度', 'NP 完全', '排序', '图算法', '近似算法', '动态规划', '分治',
          'algorithm', 'complexity', 'NP-complete', 'sorting', 'graph algorithm',
          'approximation', 'dynamic programming', '多项式时间',
        ],
      },
      {
        id: 'scientific-computing',
        name: '科学计算',
        en: 'Scientific Computing',
        keywords: [
          '科学计算', '高性能计算', '稀疏矩阵', '数值模拟', 'GPU', 'MPI', '并行', '大规模',
          'scientific computing', 'high performance', 'sparse matrix', 'simulation',
          'parallel', 'HPC', '浮点运算',
        ],
      },
      {
        id: 'machine-learning',
        name: '机器学习',
        en: 'Machine Learning',
        keywords: [
          '机器学习', '监督学习', '无监督学习', '回归', '分类', '聚类', '支持向量机', 'SVM',
          '随机森林', '梯度提升', '特征工程', '交叉验证', 'machine learning', 'supervised',
          'unsupervised', 'classification', 'regression', 'clustering',
        ],
      },
      {
        id: 'deep-learning',
        name: '深度学习',
        en: 'Deep Learning',
        keywords: [
          '深度学习', '神经网络', '卷积神经网络', 'CNN', '循环神经网络', 'RNN', 'Transformer',
          '注意力机制', '反向传播', '自动微分', '生成模型', 'GAN', '扩散模型', '预训练',
          'deep learning', 'neural network', 'attention', 'backpropagation',
        ],
      },
      {
        id: 'reinforcement-learning',
        name: '强化学习',
        en: 'Reinforcement Learning',
        keywords: [
          '强化学习', '马尔可夫决策过程', 'MDP', '值函数', 'Q-learning', '策略梯度', '贝尔曼方程',
          '探索与利用', '多臂老虎机', '奖励', '智能体', 'reinforcement learning',
          'policy gradient', 'Bellman', 'agent',
        ],
      },
    ],
  },
]

