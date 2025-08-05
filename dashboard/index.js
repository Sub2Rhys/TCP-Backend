const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const mongoose = require('mongoose');
const app = express.Router();

async function checkHttpService(port, host = '127.0.0.1', timeout = 5000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const req = http.request({
            hostname: host,
            port: port,
            method: 'GET',
            timeout: timeout
        }, (res) => {
            const responseTime = Date.now() - start;
            resolve({ online: true, responseTime });
        });

        req.on('error', () => {
            resolve({ online: false, responseTime: 0 });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ online: false, responseTime: 0 });
        });

        req.end();
    });
}

async function checkTcpService(port, host = '127.0.0.1', timeout = 5000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        
        socket.setTimeout(timeout);
        
        socket.connect(port, host, () => {
            const responseTime = Date.now() - start;
            socket.destroy();
            resolve({ online: true, responseTime });
        });

        socket.on('error', () => {
            socket.destroy();
            resolve({ online: false, responseTime: 0 });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ online: false, responseTime: 0 });
        });
    });
}

async function checkDatabase(url) {
    try {
        const start = Date.now();
        const connection = mongoose.createConnection(url, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            socketTimeoutMS: 5000
        });
        
        await connection.asPromise();
        const responseTime = Date.now() - start;
        await connection.close();
        
        return { online: true, responseTime };
    } catch (error) {
        return { online: false, responseTime: 0 };
    }
}

app.get('/', (req, res) => {
    res.render('status');
});

app.get('/services', (req, res) => {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
       
        const services = [
            { id: 'backend', name: 'Backend', port: config.port || 8080, type: 'http', enabled: true },
            { id: 'matchmaking', name: 'Matchmaking', port: config.backend?.xmpp?.port || 80, type: 'http', enabled: !!config.backend?.xmpp?.port },
            { id: 'openfire', name: 'Openfire', port: 9090, type: 'http', enabled: !!config.openfire },
            { id: 'database', name: 'Database', port: 27017, type: 'tcp', enabled: !!config.database_url, url: config.database_url }
        ];
       
        res.json({
            success: true,
            services: services.filter(s => s.enabled),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to read configuration', services: [] });
    }
});

app.get('/services/:serviceId/status', async (req, res) => {
    const { serviceId } = req.params;
    
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
        
        const serviceMap = {
            backend: { port: config.port || 8080, type: 'http' },
            matchmaking: { port: config.backend?.xmpp?.port || 80, type: 'http' },
            openfire: { port: 9090, type: 'http' },
            database: { port: 27017, type: 'tcp', url: config.database_url }
        };
       
        const serviceInfo = serviceMap[serviceId];
        if (!serviceInfo) return res.status(404).json({ error: 'Service not found' });
        
        let healthCheck;
        
        switch (serviceId) {
            case 'database':
                if (serviceInfo.url) {
                    healthCheck = await checkDatabase(serviceInfo.url);
                } else {
                    healthCheck = await checkTcpService(serviceInfo.port);
                }
                break;
            case 'backend':
            case 'matchmaking':
            case 'openfire':
                healthCheck = await checkHttpService(serviceInfo.port);
                break;
            default:
                if (serviceInfo.type === 'http') {
                    healthCheck = await checkHttpService(serviceInfo.port);
                } else {
                    healthCheck = await checkTcpService(serviceInfo.port);
                }
        }
       
        res.json({
            id: serviceId,
            online: healthCheck.online,
            responseTime: healthCheck.responseTime,
            port: serviceInfo.port,
            type: serviceInfo.type,
            lastCheck: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`Error checking ${serviceId}:`, error);
        res.status(500).json({ 
            error: 'Failed to check service status',
            id: serviceId,
            online: false,
            responseTime: 0
        });
    }
});

module.exports = app;