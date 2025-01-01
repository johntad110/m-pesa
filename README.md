# M-Pesa SDK for Node.js

## Overview

This M-Pesa SDK provides a streamlined interface for interacting with Safaricom's M-Pesa API. The SDK is written in TypeScript and offers support for key functionalities, including STK Push, C2B payments, B2C payouts, and authentication. It handles retries, error management, and pagination, making integration straightforward and robust.

---

## Features

- **Authentication**: Secure token generation and management.
- **STK Push**: Initiate M-Pesa payments to customers.
- **C2B Payments**: Register URLs for receiving customer payments.
- **B2C Payouts**: Send payments from businesses to customers.
- **Error Handling**: Centralized and consistent error management.
- **Retries**: Automatic retry mechanism for failed requests.
- **Logging**: Configurable log levels (none, error, verbose).
- **Pagination Support**: Seamless handling of paginated responses.

---

## Installation

Install the SDK using npm or yarn:

```bash
npm install mpesa-sdk
```

or

```bash
yarn add mpesa-sdk
```

---

## Configuration

Create an instance of the SDK by providing the required configuration:

```typescript
import { MPesa } from 'mpesa-sdk';

const mpesa = MPesa.getInstance({
    environment: 'sandbox', // 'sandbox' or 'production'
    apiKey: 'your-api-key',
    secretKey: 'your-secret-key',
    timeout: 7000, // Optional, default is 5000 ms
    retries: 3,    // Optional, default is 3
    logLevel: 'verbose', // Optional, 'none', 'error', or 'verbose'
});
```

---

## Authentication

Authentication is handled automatically by the SDK. Tokens are generated and cached internally. You don’t need to call the authentication endpoint directly.

---

## API Methods

### 1. STK Push (Customer Initiated Payments)

Facilitates payments initiated by customers.

#### Example:

```typescript
const response = await mpesa.stkPush({
    BusinessShortCode: '123456',
    Password: 'your-password',
    Timestamp: '20250101120000',
    TransactionType: 'CustomerPayBillOnline',
    Amount: 100,
    PartyA: '254700123456',
    PartyB: '123456',
    PhoneNumber: '254700123456',
    CallBackURL: 'https://your-callback-url.com',
    AccountReference: 'Ref123',
    TransactionDesc: 'Payment Description',
});

console.log('STK Push Response:', response);
```

#### Response:
```json
{
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

---

### 2. Register C2B URL

Register validation and confirmation URLs for receiving customer payments.

#### Example:

```typescript
const response = await mpesa.registerC2BUrl({
    ShortCode: '101010',
    ResponseType: 'Completed',
    CommandID: 'RegisterURL',
    ConfirmationURL: 'https://yourdomain.com/c2b/confirmation',
    ValidationURL: 'https://yourdomain.com/c2b/validation',
});

console.log('C2B URL Registration Response:', response);
```

#### Response:
```json
{
  "responseCode": 200,
  "responseMessage": "Request processed successfully",
  "customerMessage": "Request processed successfully"
}
```

---

### 3. B2C Payments (Business to Customer)

Send payments from businesses to customers.

#### Example:

```typescript
const response = await mpesa.b2cPayment({
    InitiatorName: 'testapi',
    SecurityCredential: 'your-security-credential',
    CommandID: 'BusinessPayment',
    PartyA: '101010',
    PartyB: '254700123456',
    Remarks: 'Test B2C',
    Amount: 100,
    QueueTimeOutURL: 'https://yourdomain.com/b2c/timeout',
    ResultURL: 'https://yourdomain.com/b2c/result',
    Occassion: 'Disbursement', // Optional
});

console.log('B2C Payment Response:', response);
```

#### Response:
```json
{
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

---

## Error Handling

The SDK provides centralized error management. Common errors are classified, and detailed error messages are returned.

#### Example:
```typescript
try {
    const response = await mpesa.stkPush(payload);
} catch (error) {
    console.error('Error:', error.message);
}
```

---

## Logging

Configure the logging level using the `logLevel` option:

- `none`: No logs.
- `error`: Logs errors only.
- `verbose`: Logs all requests, responses, and errors.

#### Example:
```typescript
const mpesa = MPesa.getInstance({
    environment: 'sandbox',
    apiKey: 'your-api-key',
    secretKey: 'your-secret-key',
    logLevel: 'verbose',
});
```

---

## Testing

- Use sandbox credentials for testing the SDK.
- Ensure callback URLs are accessible over the internet.

---

## Contribution

Contributions are welcome! Feel free to fork the repository and submit pull requests. Please ensure your code adheres to TypeScript best practices and is properly tested.

---

## License

This SDK is licensed under the [MIT License](LICENSE).

---

## Support

For any issues or queries, please open an issue in the repository or contact [support@safaricom.com](mailto:support@safaricom.com).

