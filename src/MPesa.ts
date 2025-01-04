import { AxiosError } from 'axios';
import { APIClient } from './APIClient';
import { AuthenticationError, B2CError, RegisterUrlError, StkPushError } from './errors/MPesaError';
import { AuthResponse, AuthResponseType } from './models/AuthResponse';
import { StkPushPayloadType, StkPushResponse, StkPushResponseType } from './models/StkPushResponse';
import { B2CPayloadType, B2CResponse, B2CResponseType } from './models/B2CPaymentResponse';
import { RegisterUrlPayloadType, RegisterUrlResponse, RegisterUrlResponseType } from './models/C2BUrlResponse';

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
            const response = await this.apiClient.requestWithRetry<AuthResponseType>(
                'GET',
                '/v1/token/generate?grant_type=client_credentials',
                undefined,
                { headers }
            );

            const authResponse = AuthResponse.fromApiResponse(response.data)

            this.accessToken = authResponse.accessToken;
            this.tokenExpiry = Date.now() + authResponse.expiresIn * 1000;

            if (this.config.logLevel === 'verbose') {
                console.log('Authentication successful');
            }
        } catch (error) {
            if (error instanceof AxiosError && error.response) {
                const { resultCode, resultDesc } = error.response.data;
                throw new AuthenticationError(resultDesc, resultCode);
            }
            throw new Error('Network error or unexpected issue');
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

        const res = await this.apiClient.requestWithRetry<T>(method, endpoint, data, { headers });
        return res.data;
    }

    /**
     * Sends an STK Push request to the M-Pesa API.
     * @param payload - The payload for the STK Push request.
     * @returns A StkPushResponse instance representing the response.
     * @throws StkPushError if the API returns an error response.
     */
    public async stkPush(payload: StkPushPayloadType): Promise<StkPushResponse> {
        try {
            const response = await this.makeAuthorizedRequest<StkPushResponseType>(
                'POST',
                '/mpesa/stkpush/v3/processrequest',
                payload
            );

            const stkPushResponse = StkPushResponse.fromApiResponse(response);

            if (!stkPushResponse.isSuccess()) {
                throw new StkPushError(
                    'STK Push request failed',
                    response
                );
            }

            return stkPushResponse;
        } catch (error) {
            if (error instanceof StkPushError) {
                throw error; // Re-throw STK Push-specific errors
            }

            throw new Error('Unexpected error occurred during STK Push');
        }
    }

    /**
     * Registers validation and confirmation URLs with the M-Pesa API.
     * @param payload - The payload for the Register URL request.
     * @returns A RegisterUrlResponse instance representing the response.
     * @throws RegisterUrlError if the API returns an error response.
     */
    public async registerC2BUrl(payload: RegisterUrlPayloadType): Promise<RegisterUrlResponse> {
        try {
            const response = await this.makeAuthorizedRequest<RegisterUrlResponseType>(
                'POST',
                `/v1/c2b-register-url/register?apikey=${this.config.apiKey}`,
                payload
            );

            const registerResponse = RegisterUrlResponse.fromApiResponse(response);

            if (!registerResponse.isSuccess()) {
                throw new RegisterUrlError(
                    'Register URL request failed',
                    response
                );
            }

            return registerResponse;
        } catch (error) {
            if (error instanceof RegisterUrlError) {
                throw error; // Re-throw Register URL-specific errors
            }

            throw new Error('Unexpected error occurred during Register URL');
        }
    }


    /**
     * Sends a B2C Pay Out request to the M-Pesa API.
     * @param payload - The payload for the B2C Pay Out request.
     * @returns A B2CResponse instance representing the response.
     * @throws B2CError if the API returns an error response.
     */
    public async b2cPayment(payload: B2CPayloadType): Promise<B2CResponse> {
        try {
            const response = await this.makeAuthorizedRequest<B2CResponseType>(
                'POST',
                '/mpesa/b2c/v2/paymentrequest',
                payload
            );

            const b2cResponse = B2CResponse.fromApiResponse(response);

            if (!b2cResponse.isSuccess()) {
                throw new B2CError(
                    'B2C Pay Out request failed',
                    {
                        requestId: 'Unknown', // Replace with actual data if available
                        errorCode: b2cResponse.ResponseCode,
                        errorMessage: b2cResponse.ResponseDescription,
                    }
                );
            }

            return b2cResponse;
        } catch (error) {
            if (error instanceof B2CError) {
                throw error; // Re-throw B2C-specific errors
            }

            throw new Error('Unexpected error occurred during B2C Pay Out');
        }
    }

}
