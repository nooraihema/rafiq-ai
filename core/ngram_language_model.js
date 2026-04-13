// N-Gram Language Model v1.0 for Local Text Generation

class NGramLanguageModel {
    constructor(n) {
        this.n = n;
        this.ngrams = new Map();
    }

    train(corpus) {
        const tokens = corpus.split(/\s+/);
        for (let i = 0; i <= tokens.length - this.n; i++) {
            const ngram = tokens.slice(i, i + this.n).join(' ');
            const nextToken = tokens[i + this.n];
            if (!this.ngrams.has(ngram)) {
                this.ngrams.set(ngram, []);
            }
            this.ngrams.get(ngram).push(nextToken);
        }
    }

    generate(start, length) {
        let currentNGram = start;
        const output = [currentNGram];

        for (let i = 0; i < length; i++) {
            const nextTokens = this.ngrams.get(currentNGram);
            if (!nextTokens) break;
            const nextToken = nextTokens[Math.floor(Math.random() * nextTokens.length)];
            output.push(nextToken);
            const tokens = currentNGram.split(' ');
            tokens.shift();
            tokens.push(nextToken);
            currentNGram = tokens.join(' ');
        }

        return output.join(' ');
    }
}

// Example usage:
const model = new NGramLanguageModel(2);
model.train("This is a simple example to demonstrate the N-Gram language model");
console.log(model.generate("This is", 10));