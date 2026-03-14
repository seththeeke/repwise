export declare const ok: (body: unknown) => {
    statusCode: number;
    headers: {
        'Content-Type': string;
    };
    body: string;
};
export declare const created: (body: unknown) => {
    statusCode: number;
    headers: {
        'Content-Type': string;
    };
    body: string;
};
export declare const noContent: () => {
    statusCode: number;
    body: string;
};
export declare const badRequest: (message: string) => {
    statusCode: number;
    body: string;
};
export declare const unauthorized: () => {
    statusCode: number;
    body: string;
};
export declare const forbidden: () => {
    statusCode: number;
    body: string;
};
export declare const notFound: (resource?: string) => {
    statusCode: number;
    body: string;
};
export declare const serverError: (err?: unknown) => {
    statusCode: number;
    body: string;
};
//# sourceMappingURL=response.d.ts.map