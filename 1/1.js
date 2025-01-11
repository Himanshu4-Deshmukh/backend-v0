const express = require('express');
const axios = require('axios');

// Configuration
const API_CONFIG = {
    baseURL: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0',
    credentials: {
        username: 'easify_usr',
        password: 'easify@10122024'
    },
    initialToken: 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJlYXNpZnlfdXNyIiwiaWF0IjoxNzM1Mzk2MzAyLCJhcHBzIjoiZGF0YXB1c2gifQ.mNEom226k0U94gAYNmU0IztRh9OOdTrxZ6rq25TATkUiYXYaXEdJfVCvpQngll3RuCx4zViQzuTq2IgQU_2FtQ',
    tokenRefreshInterval: 23 * 60 * 60 * 1000 // 23 hours in milliseconds
};

// Auth Service
class AuthService {
    constructor() {
        this.token = API_CONFIG.initialToken;
        this.setupAutoRefresh();
    }

    setupAutoRefresh() {
        setTimeout(() => {
            this.refreshToken();
            setInterval(() => this.refreshToken(), API_CONFIG.tokenRefreshInterval);
        }, API_CONFIG.tokenRefreshInterval);
    }

    async refreshToken() {
        try {
            const response = await axios.post(
                ${API_CONFIG.baseURL}/user/login,
                API_CONFIG.credentials,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            this.token = response.data.token;
            console.log('Token refreshed successfully');
        } catch (error) {
            console.error('Token refresh failed:', error.message);
            setTimeout(() => this.refreshToken(), 5 * 60 * 1000);
        }
    }

    getToken() {
        return this.token;
    }
}

// API Service
class APIService {
    constructor(authService) {
        this.authService = authService;
    }

    async makeRequest(endpoint, payload) {
        try {
            const response = await axios.post(
                ${API_CONFIG.baseURL}/${endpoint},
                payload,
                {
                    headers: {
                        'Authorization': Bearer ${this.authService.getToken()},
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('API request failed:', error.message);
            throw error;
        }
    }
}

// Initialize services
const authService = new AuthService();
const apiService = new APIService(authService);

// Express app setup
const app = express();
app.use(express.json());

// API routes
app.post('/vahan', async (req, res) => {
    try {
        const result = await apiService.makeRequest('VAHAN/01', {
            vehiclenumber: req.body.vehicleNumber
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vehicle details' });
    }
});

app.post('/fastag', async (req, res) => {
    try {
        const { tagId } = req.body;
        if (!tagId) {
            return res.status(400).json({ error: 'tagId is required' });
        }
        const result = await apiService.makeRequest('FASTAG/02', {
            tagid: tagId
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch FastTag details' });
    }
});

app.post('/echallan', async (req, res) => {
    try {
        const { vehicleNumber } = req.body;
        if (!vehicleNumber) {
            return res.status(400).json({ error: 'vehicleNumber is required' });
        }
        const result = await apiService.makeRequest('ECHALLAN/01', {
            vehicleNumber: vehicleNumber  // Changed from vehiclenumber to vehicleNumber
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch E-Challan details' });
    }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(Server running on port ${PORT});
    console.log('Token refresh system initialized - will refresh every 23 hours');
});

module.exports = app;