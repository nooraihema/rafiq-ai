
/**
 * /core/attention_layer.js
 * AttentionLayer v3.0 - Unified Field Energy Edition
 * وظيفته: توزيع "طاقة التركيز" على عقد الفضاء الموحد (Workspace Nodes) باستخدام القواميس والرياضيات.
 */

import { normalizeArabic } from './utils.js';

const ATTENTION_CONFIG = {
  NUM_HEADS: 4,
  HIDDEN_DIM: 128,
  SCALE_FACTOR: Math.sqrt(32),
  PSYCH_BOOST_MAX: 3.5,    // أقصى قوة جذب للكلمات السريرية
  EMOTIONAL_BOOST: 2.8,   // قوة جذب الكلمات العاطفية
  STOP_WORD_PENALTY: 0.1, // إضعاف شديد لكلمات الحشو
  CONTEXT_SPREAD: 0.4      // مدى انتقال الانتباه للكلمات المجاورة
};

// --- المساعدات الرياضية (كما هي بدون تغيير) ---
function softmax(arr) {
  const max = Math.max(...arr);
  const exp = arr.map(x => Math.exp(x - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(x => x / sum);
}

function matmul(a, b) {
  const result = [];
  for (let i = 0; i < a.length; i++) {
    result[i] = [];
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];
      result[i][j] = sum;
    }
  }
  return result;
}

function initializeWeights(rows, cols) {
  const limit = Math.sqrt(6 / (rows + cols));
  return Array.from({ length: rows }, () => 
    Array.from({ length: cols }, () => (Math.random() * 2 - 1) * limit)
  );
}

// ============================================================================
// Token Embedding Layer (المطورة للعمل مع القواميس كـ Gravity)
// ============================================================================
export class TokenEmbedding {
  constructor(dictionaries) {
    this.embeddingDim = ATTENTION_CONFIG.HIDDEN_DIM;
    this.anchors = dictionaries.anchors || {};
    this.concepts = dictionaries.concepts || {};
    this.stopWords = dictionaries.stopWords || new Set();
  }

  /**
   * تحويل الكلمة لمتجه مع حقن "الجاذبية النفسية" المستمدة من القواميس
   */
  embed(token, stem) {
    const norm = normalizeArabic(token);
    const normStem = normalizeArabic(stem);

    // 1. توليد المتجه الأساسي
    let embedding = this._generateBaseVector(norm);

    // 2. حساب "معامل الجاذبية" (Gravity Factor) من القواميس
    let gravity = 1.0;

    if (this.stopWords.has(norm)) {
      gravity = ATTENTION_CONFIG.STOP_WORD_PENALTY;
    } else {
      // إذا كانت الكلمة في قاموس المفاهيم (مثل اكتئاب) تأخذ أعلى جاذبية
      if (this.concepts[norm] || this.concepts[normStem]) {
        gravity = ATTENTION_CONFIG.PSYCH_BOOST_MAX;
      } 
      // إذا كانت في قاموس المراسي (مثل حزين) تأخذ جاذبية عالية
      else if (this.anchors[norm] || this.anchors[normStem]) {
        gravity = ATTENTION_CONFIG.EMOTIONAL_BOOST;
      }
    }

    // 3. حقن الجاذبية في المتجه (شحن الكلمة طاقياً)
    return embedding.map(v => v * gravity);
  }

  _generateBaseVector(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) hash = ((hash << 5) - hash) + token.charCodeAt(i);
    const seed = Math.abs(hash) / 2147483647;
    return Array.from({ length: this.embeddingDim }, (_, i) => {
      const val = Math.sin(seed + i) * 10000;
      return val - Math.floor(val) - 0.5;
    });
  }
}

// ============================================================================
// Full Attention Layer (محرك طاقة الفضاء)
// ============================================================================
export class AttentionLayer {
  constructor(dictionaries) {
    console.log("%c🎯 [AttentionLayer v3.0] تهيئة محرك جاذبية الفضاء الموحد...", "color: #FF9800; font-weight: bold;");
    
    this.embeddingLayer = new TokenEmbedding(dictionaries);
    
    // مصفوفات الأوزان للرؤوس (تحافظ على التعلم الرياضي)
    this.WQ = initializeWeights(ATTENTION_CONFIG.HIDDEN_DIM, 32);
    this.WK = initializeWeights(ATTENTION_CONFIG.HIDDEN_DIM, 32);
    this.WV = initializeWeights(ATTENTION_CONFIG.HIDDEN_DIM, 32);
  }

  /**
   * العملية الرئيسية: شحن الـ Workspace بالطاقة
   */
  async process(workspace) {
    console.log("\n" + "%c[Attention Energizing] STARTING...".repeat(1), "background: #FF9800; color: #fff; padding: 2px 5px;");
    
    if (!workspace || !workspace.nodes) {
        console.error("❌ [AttentionLayer]: Workspace مفقود.");
        return;
    }

    try {
      const nodes = workspace.nodes;
      
      // 1. تحويل العقد لمتجهات مشحونة (بناءً على هويتها وقواميسها)
      console.log("   🔸 [Step 1] شحن عقد الفضاء بالجاذبية النفسية...");
      const embeddings = nodes.map(node => 
        this.embeddingLayer.embed(node.original, node.core)
      );

      // 2. حساب العلاقات الرياضية (Dot-Product Attention)
      const Q = matmul(embeddings, this.WQ);
      const K = matmul(embeddings, this.WK);
      const V = matmul(embeddings, this.WV);

      const rawScores = this._computeScores(Q, K);
      const weights = rawScores.map(row => softmax(row));

      // 3. حقن الطاقة النهائية في الـ Workspace Nodes
      console.log("   🔸 [Step 2] توزيع طاقة الانتباه على نسيج الجملة...");
      nodes.forEach((node, i) => {
        // متوسط الطاقة التي تلقتها هذه العقدة من باقي العقد
        const nodeEnergy = weights.reduce((sum, row) => sum + row[i], 0) / nodes.length;
        
        // تحديث العقدة مباشرة داخل الفضاء
        node.salience = nodeEnergy;
        
        if (nodeEnergy > 0.15) {
            console.log(`      ✨ [Node ${i} Energized]: "${node.original}" حصلت على طاقة تركيز: ${nodeEnergy.toFixed(2)}`);
        }
      });

      // 4. تحديث حالة الفضاء الكلية
      const topNode = [...nodes].sort((a,b) => b.salience - a.salience)[0];
      workspace.state.focusNode = topNode.original;
      workspace.state.fieldEnergy = topNode.salience;

      console.log(`   ✅ [Energizing Complete]: بؤرة طاقة المجال هي "${topNode.original}"`);

    } catch (err) {
      console.error("❌ [AttentionLayer Error]:", err);
    }
  }

  _computeScores(Q, K) {
    const scores = [];
    for (let i = 0; i < Q.length; i++) {
      scores[i] = [];
      for (let j = 0; j < K.length; j++) {
        let dot = 0;
        for (let k = 0; k < Q[i].length; k++) dot += Q[i][k] * K[j][k];
        scores[i][j] = dot / ATTENTION_CONFIG.SCALE_FACTOR;
      }
    }
    return scores;
  }
}

export default AttentionLayer;
