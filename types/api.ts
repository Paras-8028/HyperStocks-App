export type ApiSuccess<T> = {
    success: true;
    data: T;
    message?: string;
};

export type ApiFailure<E = string> = {
    success: false;
    error: E;
    code?: string | number;
};

export type ApiResult<T, E = string> = ApiSuccess<T> | ApiFailure<E>;

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface RequestOptions {
    timeoutMs?: number;
    revalidateSeconds?: number;
    retries?: number;
    headers?: Record<string, string>;
}
