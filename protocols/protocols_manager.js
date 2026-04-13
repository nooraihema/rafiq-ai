class ProtocolsManager {
    constructor() {
        this.protocols = {};
    }

    loadProtocol(name) {
        try {
            const protocol = require(`./protocols/${name}`);
            this.protocols[name] = protocol;
            return protocol;
        } catch (error) {
            console.error(`Failed to load protocol: ${name}`, error);
            throw error;
        }
    }

    getProtocol(name) {
        return this.protocols[name] || null;
    }

    loadAllProtocols() {
        const fs = require('fs');
        const path = './protocols';
        fs.readdirSync(path).forEach(file => {
            if (file.endsWith('.js')) {
                this.loadProtocol(file.replace('.js', ''));
            }
        });
    }
}

module.exports = ProtocolsManager;