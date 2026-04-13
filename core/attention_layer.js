
/**
 * /core/attention_layer.js
 * Attention Layer v2.0 - Contextual Psychological Attention (CPA)
 * وظيفته: تحديد بؤرة التركيز في الجملة بناءً على القواميس والرياضيات معاً.
 */

import { normalizeArabic } from './utils.js';

const ATTENTION_CONFIG = {
  NUM_HEADS: 4,
  HIDDEN_DIM: 128,
  SCALE_FACTOR: Math.sqrt(32),
  PSYCH_BOOST_FACTOR: 2.5, // مدى قوة جذب الكلمات النفسية للانتباه
  STOP_WORD_PENALTY: 0.2    // مدى إضعاف الكلمات الحشوية
};

// --- وظائف رياضية مساعدة ---
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
// Token Embedding Layer (المطورة سيكولوجياً)
// ============================================================================
export class TokenEmbedding {
  constructor(dictionaries) {
    this.embeddingDim = ATTENTION_CONFIG.HIDDEN_DIM;
    this.embeddings = new Map();
    
    // ربط القواميس لتوجيه الانتباه
    this.anchors = dictionaries.anchors || {};
    this.concepts = dictionaries.concepts || {};
    this.stopWords = dictionaries.stopWords || new Set();
  }

  /**
   * تحويل الكلمة لمتجه مع "حقن" الثقل النفسي
   */
  embed(token, stemmed) {
    const norm = normalizeArabic(token);
    const normStem = normalizeArabic(stemmed);

    // 1. إنشاء المتجه الأساسي (حتمي بناءً على الحروف)
    let embedding = this._generateBaseVector(norm);

    // 2. حساب "الثقل النفسي" من القواميس
    let psychWeight = 1.0;
    
    if (this.stopWords.has(norm)) {
      psychWeight = ATTENTION_CONFIG.STOP_WORD_PENALTY;
    } else if (this.anchors[norm] || this.anchors[normStem]) {
      psychWeight = ATTENTION_CONFIG.PSYCH_BOOST_FACTOR; // كلمات المشاعر تجذب انتباهاً أعلى
    } else if (this.concepts[norm] || this.concepts[normStem]) {
      psychWeight = ATTENTION_CONFIG.PSYCH_BOOST_FACTOR * 0.8;
    }

    // 3. تطبيق الثقل على المتجه
    return embedding.map(v => v * psychWeight);
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
// Full Attention Layer (الأوركسترا)
// ============================================================================
export class AttentionLayer {
  constructor(dictionaries) {
    console.log("%c🎯 [AttentionLayer] جاري تهيئة طبقة الانتباه النفسي...", "color: #FF9800; font-weight: bold;");
    
    this.embeddingLayer = new TokenEmbedding(dictionaries);
    
    // مصفوفات الأوزان لرؤوس الانتباه
    this.WQ = initializeWeights(ATTENTION_CONFIG.HIDDEN_DIM, 32);
    this.WK = initializeWeights(ATTENTION_CONFIG.HIDDEN_DIM, 32);
    this.WV = initializeWeights(ATTENTION_CONFIG.HIDDEN_DIM, 32);
    
    this.debug = true;
  }

  /**
   * العملية الكبرى: تحليل النص وتوزيع الأوزان
   */
  async process(tokens, stems = []) {
    console.log("\n" + "%c[Attention Processing] START".repeat(1), "background: #FF9800; color: #fff; padding: 2px 5px;");
    
    try {
      // 1. التضمين (Embedding) مع مراعاة القواميس
      console.log("   🔸 [Step 1] جاري تحويل الكلمات لمتجهات مشحونة نفسياً...");
      const embeddings = tokens.map((t, i) => this.embeddingLayer.embed(t, stems[i] || t));

      // 2. حساب Query, Key, Value (مبسط لرأس واحد للتوضيح الرياضي)
      const Q = matmul(embeddings, this.WQ);
      const K = matmul(embeddings, this.WK);
      const V = matmul(embeddings, this.WV);

      // 3. حساب درجات الانتباه (Attention Scores)
      console.log("   🔸 [Step 2] جاري حساب مصفوفة العلاقات (Attention Scores)...");
      const rawScores = this._computeScores(Q, K);
      
      // 4. تطبيق Softmax للحصول على الأوزان النهائية
      const attentionWeights = rawScores.map(row => softmax(row));

      // 5. استخراج "خريطة الأهمية" (Salience Map)
      const salienceMap = this._generateSalienceMap(tokens, attentionWeights);

      if (this.debug) {
        const top = Object.entries(salienceMap).sort((a,b) => b[1]-a[1])[0];
        console.log(`   ✅ [Attention Focus]: الكلمة الأكثر تأثيراً هي "${top[0]}" بوزن ${top[1].toFixed(2)}`);
      }

      return {
        salienceMap,
        attentionWeights,
        focusToken: this._getTopToken(salienceMap)
      };

    } catch (err) {
      console.error("❌ [AttentionLayer Error]:", err);
      return { salienceMap: {}, focusToken: tokens[0] };
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

  _generateSalienceMap(tokens, weights) {
    const map = {};
    tokens.forEach((token, i) => {
      // متوسط انتباه الجملة لهذه الكلمة
      const avgWeight = weights.reduce((sum, row) => sum + row[i], 0) / tokens.length;
      map[token] = avgWeight;
    });
    return map;
  }

  _getTopToken(map) {
    return Object.entries(map).sort((a,b) => b[1]-a[1])[0]?.[0];
  }
}

export default AttentionLayer;
