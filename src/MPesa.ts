import { APIClient } from './APIClient'; // Assuming the APIClient is in the same directory

export interface MpesaConfig {
    environment: 'sandbox' | 'production';
    apiKey: string;
    secretKey: string;
    timeout?: number;
    retries?: number;
    logLevel?: 'none' | 'error' | 'verbose';
}

export class MPesa {
    private static instance: MPesa;
    private config: MpesaConfig;
    private apiClient: APIClient;
    private accessToken: string | null = null;
    private tokenExpiry: number | null = null;

    private constructor(config: MpesaConfig) {
        this.config = config;

        const baseURL =
            config.environment === 'sandbox'
                ? 'https://apisandbox.safaricom.et'
                : 'https://api.safaricom.et';

        this.apiClient = new APIClient({
            baseURL,
            timeout: config.timeout,
            retries: config.retries,
        });
    }

    public static getInstance(config: MpesaConfig): MPesa {
        if (!MPesa.instance) {
            MPesa.instance = new MPesa(config);
        }
        return MPesa.instance;
    }

    private async authenticate(): Promise<void> {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return; // Token is still valid
        }

        const credentials = Buffer.from(
            `${this.config.apiKey}:${this.config.secretKey}`
        ).toString('base64');

        const headers = {
            Authorization: `Basic ${credentials}`,
        };

        try {
            const response = await this.apiClient.requestWithRetry<{ access_token: string; expires_in: string }>(
                'GET',
                '/v1/token/generate?grant_type=client_credentials',
                undefined,
                { headers }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + parseInt(response.data.expires_in, 10) * 1000;

            if (this.config.logLevel === 'verbose') {
                console.log('Authentication successful');
            }
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    private async makeAuthorizedRequest<T>(
        method: 'GET' | 'POST',
        endpoint: string,
        data?: unknown
    ): Promise<T> {
        await this.authenticate();

        const headers = {
            Authorization: `Bearer ${this.accessToken}`,
        };

        return this.apiClient.requestWithRetry<T>(method, endpoint, data, { headers });
    }

    // STK Push
    public async stkPush(payload: {
        BusinessShortCode: string;
        Password: string;
        Timestamp: string;
        TransactionType: string;
        Amount: number;
        PartyA: string;
        PartyB: string;
        PhoneNumber: string;
        CallBackURL: string;
        AccountReference: string;
        TransactionDesc: string;
    }): Promise<{ ResponseCode: string; ResponseDescription: string }> {
        return this.makeAuthorizedRequest('POST', '/mpesa/stkpush/v3/processrequest', payload);
    }

    // C2B Example
    public async registerC2BUrl(payload: {
        ShortCode: string;
        ResponseType: string;
        CommandID: string;
        ConfirmationURL: string;
        ValidationURL: string;
    }): Promise<{ responseCode: number; responseMessage: string }> {
        return this.makeAuthorizedRequest('POST', '/v1/c2b-register-url/register', payload);
    }

    // B2C Example
    public async b2cPayment(payload: {
        InitiatorName: string;
        SecurityCredential: string;
        CommandID: string;
        PartyA: string;
        PartyB: string;
        Remarks: string;
        Amount: number;
        QueueTimeOutURL: string;
        ResultURL: string;
        Occassion?: string;
    }): Promise<{ ResponseCode: string; ResponseDescription: string }> {
        return this.makeAuthorizedRequest('POST', '/mpesa/b2c/v1/paymentrequest', payload);
    }
}
