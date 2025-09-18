// shared/math_tools.js

    /**
     * Calculates cosine similarity between two vectors.
     */
    export function cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Normalizes a vector to have a length of 1.
     */
    export function normalizeVector(vec) {
        if (!vec) return [];
        const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
        if (magnitude === 0) return vec.map(() => 0);
        return vec.map(val => parseFloat((val / magnitude).toFixed(4)));
    }

    /**
     * Calculates the moving average of a sequence of numbers.
     */
    export function movingAverage(data, windowSize) {
        if (!data || data.length < windowSize) return 0;
        const slice = data.slice(-windowSize);
        const sum = slice.reduce((acc, val) => acc + val, 0);
        return sum / windowSize;
    }

    /**
     * Performs a simple linear regression and returns the slope.
     */
    export function linearRegression(data) {
        if (!data || data.length < 2) return 0;
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += data[i];
            sumXY += i * data[i];
            sumXX += i * i;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return isNaN(slope) ? 0 : slope;
    }
