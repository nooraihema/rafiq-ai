// /core/attention_layer.js
// Attention Layer v1.0 - Self-Attention & Multi-Head Implementation
// This layer bridges the semantic analysis and advanced response generation
// ============================================================================

import { normalizeArabic } from './utils.js';

// ============================================================================
// قيم مساعدة (Tuning Parameters)
// ============================================================================
const ATTENTION_CONFIG = {
  NUM_HEADS: 4,
  HIDDEN_DIM: 128,
  SEQUENCE_LENGTH: 50,
  DROPOUT: 0.1,
  ATTENTION_DROPOUT: 0.15,
  SCALE_FACTOR: Math.sqrt(32) // sqrt(HIDDEN_DIM / NUM_HEADS)
};

// ============================================================================
// Utility Functions
// ============================================================================
function softmax(arr) {
  const max = Math.max(...arr);
  const exp = arr.map(x => Math.exp(x - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(x => x / sum);
}

function matmul(a, b) {
  // Matrix multiplication: (n, m) × (m, k) → (n, k)
  const result = [];
  for (let i = 0; i < a.length; i++) {
    result[i] = [];
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function initializeWeights(rows, cols) {
  // Xavier initialization
  const limit = Math.sqrt(6 / (rows + cols));
  const matrix = [];
  for (let i = 0; i < rows; i++) {
    matrix[i] = [];
    for (let j = 0; j < cols; j++) {
      matrix[i][j] = (Math.random() * 2 - 1) * limit;
    }
  }
  return matrix;
}

// ============================================================================
// Token Embedding Layer
// ============================================================================
export class TokenEmbedding {
  constructor(vocabSize = 5000, embeddingDim = ATTENTION_CONFIG.HIDDEN_DIM) {
    this.vocabSize = vocabSize;
    this.embeddingDim = embeddingDim;
    
    // Initialize embedding matrix (يتم تحميله من القاموس)
    this.embeddings = new Map();
    this._initializeRandomEmbeddings(500); // تهيئة 500 تضمين عشوائي
  }

  _initializeRandomEmbeddings(count) {
    for (let i = 0; i < count; i++) {
      const emb = [];
      for (let j = 0; j < this.embeddingDim; j++) {
        emb.push((Math.random() - 0.5) * 0.1);
      }
      this.embeddings.set(`token_${i}`, emb);
    }
  }

  /**
   * تحويل كلمة أو رمز إلى تمثيل متجه
   */
  embed(token) {
    // التحقق من وجود التضمين المسبق
    let cached = this.embeddings.get(token);
    if (cached) return cached;

    // إنشاء تضمين جديد بناءً على خصائص الرمز
    const embedding = [];
    const hash = this._tokenHash(token);
    
    for (let i = 0; i < this.embeddingDim; i++) {
      // استخدام دالة حتمية لإنشاء تضمين متسق
      const seeded = Math.sin(hash + i * 12.9898) * 43758.5453;
      embedding[i] = seeded - Math.floor(seeded);
    }

    this.embeddings.set(token, embedding);
    return embedding;
  }

  _tokenHash(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
  }

  /**
   * تضمين متسلسلة من الرموز
   */
  embedSequence(tokens) {
    return tokens.map(t => this.embed(t));
  }
}

// ============================================================================
// Self-Attention Head
// ============================================================================
export class AttentionHead {
  constructor(inputDim, headDim) {
    this.inputDim = inputDim;
    this.headDim = headDim;

    // مصفوفات الأوزان (Q, K, V)
    this.WQ = initializeWeights(inputDim, headDim);
    this.WK = initializeWeights(inputDim, headDim);
    this.WV = initializeWeights(inputDim, headDim);

    this.debug = false;
  }

  /**
   * حساب الاهتمام (Attention Scores)
   */
  forward(query, key, value, mask = null) {
    // تحويل الاستعلام والمفتاح والقيمة
    const Q = matmul(query, this.WQ);      // (seq_len, headDim)
    const K = matmul(key, this.WK);        // (seq_len, headDim)
    const V = matmul(value, this.WV);      // (seq_len, headDim)

    // حساب درجات الاهتمام: (Q · K^T) / sqrt(d_k)
    const scores = this._computeAttentionScores(Q, K);

    // تطبيق القناع (mask) إن وجد
    if (mask) {
      for (let i = 0; i < scores.length; i++) {
        for (let j = 0; j < scores[i].length; j++) {
          if (!mask[i][j]) scores[i][j] = -1e10;
        }
      }
    }

    // تطبيق softmax
    const weights = scores.map(row => softmax(row));

    // تطبيق الأوزان على القيم
    const output = matmul(weights, V);

    return { output, weights };
  }

  _computeAttentionScores(Q, K) {
    const scores = [];
    for (let i = 0; i < Q.length; i++) {
      scores[i] = [];
      for (let j = 0; j < K.length; j++) {
        let score = 0;
        for (let k = 0; k < Q[i].length; k++) {
          score += Q[i][k] * K[j][k];
        }
        scores[i][j] = score / ATTENTION_CONFIG.SCALE_FACTOR;
      }
    }
    return scores;
  }
}

// ============================================================================
// Multi-Head Attention
// ============================================================================
export class MultiHeadAttention {
  constructor(inputDim = ATTENTION_CONFIG.HIDDEN_DIM, numHeads = ATTENTION_CONFIG.NUM_HEADS) {
    this.inputDim = inputDim;
    this.numHeads = numHeads;
    this.headDim = Math.floor(inputDim / numHeads);

    // إنشاء رؤوس متعددة
    this.heads = [];
    for (let i = 0; i < numHeads; i++) {
      this.heads.push(new AttentionHead(inputDim, this.headDim));
    }

    // مصفوفة الإسقاط النهائي
    this.WO = initializeWeights(inputDim, inputDim);
  }

  /**
   * المعالجة الأمامية (Forward Pass)
   */
  forward(query, key, value, mask = null) {
    const headOutputs = [];
    const headWeights = [];

    // تشغيل كل رأس
    for (let i = 0; i < this.heads.length; i++) {
      const { output, weights } = this.heads[i].forward(query, key, value, mask);
      headOutputs.push(output);
      headWeights.push(weights);
    }

    // دمج نواتج الرؤوس (Concatenation)
    const concatenated = this._concatenateHeads(headOutputs);

    // إسقاط نهائي
    const finalOutput = matmul(concatenated, this.WO);

    return {
      output: finalOutput,
      headWeights,
      concatenated
    };
  }

  _concatenateHeads(heads) {
    const concatenated = [];
    for (let i = 0; i < heads[0].length; i++) {
      concatenated[i] = [];
      for (let h = 0; h < heads.length; h++) {
        concatenated[i].push(...heads[h][i]);
      }
    }
    return concatenated;
  }
}

// ============================================================================
// Full Attention Layer (يجمع كل شيء معاً)
// ============================================================================
export class AttentionLayer {
  constructor(vocabSize = 5000, hiddenDim = ATTENTION_CONFIG.HIDDEN_DIM, numHeads = ATTENTION_CONFIG.NUM_HEADS) {
    this.vocabSize = vocabSize;
    this.hiddenDim = hiddenDim;
    this.numHeads = numHeads;

    // الطبقات الأساسية
    this.tokenEmbedding = new TokenEmbedding(vocabSize, hiddenDim);
    this.multiHeadAttention = new MultiHeadAttention(hiddenDim, numHeads);

    // Feed-Forward Network
    this.ffnDim = hiddenDim * 4;
    this.W1 = initializeWeights(hiddenDim, this.ffnDim);
    this.W2 = initializeWeights(this.ffnDim, hiddenDim);

    // Layer Normalization (بسيط)
    this.epsilon = 1e-6;

    this.debug = true;
  }

  /**
   * معالجة النص بالكامل
   */
  processText(tokens) {
    if (this.debug) {
      console.log("[AttentionLayer] Processing text:", tokens.slice(0, 5));
    }

    // 1. تضمين الرموز (Token Embedding)
    const embeddings = this.tokenEmbedding.embedSequence(tokens);

    // 2. تطبيق Multi-Head Attention
    const attentionOutput = this.multiHeadAttention.forward(embeddings, embeddings, embeddings);

    // 3. تطبيق Layer Normalization + Residual
    const normalized = this._layerNorm(attentionOutput.output);

    // 4. تطبيق Feed-Forward Network
    const ffnOutput = this._feedForward(normalized);

    // 5. Layer Normalization + Residual
    const finalOutput = this._layerNorm(ffnOutput);

    if (this.debug) {
      console.log("[AttentionLayer] Output shape:", finalOutput.length, "×", finalOutput[0]?.length);
    }

    return {
      embeddings,
      attentionOutput: attentionOutput.output,
      finalOutput,
      weights: attentionOutput.headWeights
    };
  }

  /**
   * تطبيق ReLU + تحويل خطي
   */
  _feedForward(input) {
    // تطبيق ReLU(x @ W1)
    const hidden = matmul(input, this.W1);
    const activated = hidden.map(row => 
      row.map(x => Math.max(0, x)) // ReLU
    );

    // تطبيق تحويل خطي ثاني
    const output = matmul(activated, this.W2);
    return output;
  }

  /**
   * Layer Normalization + Residual Connection
   */
  _layerNorm(x) {
    const normalized = [];
    
    for (let i = 0; i < x.length; i++) {
      const row = x[i];
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance = row.reduce((a, b) => a + (b - mean) ** 2, 0) / row.length;
      const std = Math.sqrt(variance + this.epsilon);

      normalized[i] = row.map(val => (val - mean) / std);
    }

    return normalized;
  }

  /**
   * استخراج السياق من توزيع الاهتمام
   */
  extractContextWeights(tokens) {
    const output = this.processText(tokens);
    
    // حساب متوسط أوزان الاهتمام عبر جميع الرؤوس
    const avgWeights = this._averageWeights(output.weights);

    // استخراج العلاقات المهمة
    const contextMap = {};
    for (let i = 0; i < Math.min(tokens.length, 10); i++) {
      contextMap[tokens[i]] = avgWeights[i];
    }

    return {
      tokenWeights: contextMap,
      focusTokens: this._getTopTokens(contextMap, 5)
    };
  }

  _averageWeights(headWeights) {
    const avgWeight = new Array(headWeights[0].length).fill(0);
    
    for (let h = 0; h < headWeights.length; h++) {
      for (let i = 0; i < headWeights[h].length; i++) {
        const sum = headWeights[h][i].reduce((a, b) => a + b, 0);
        avgWeight[i] += sum / headWeights[h][i].length;
      }
    }

    return avgWeight.map(w => w / headWeights.length);
  }

  _getTopTokens(contextMap, n) {
    return Object.entries(contextMap)
      .sort((a, b) => {
        const avgB = b[1].reduce((a, c) => a + c, 0) / b[1].length;
        const avgA = a[1].reduce((a, c) => a + c, 0) / a[1].length;
        return avgB - avgA;
      })
      .slice(0, n)
      .map(([token]) => token);
  }
}

export default AttentionLayer;