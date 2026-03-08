export const ok = (body: unknown) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const created = (body: unknown) => ({
  statusCode: 201,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const noContent = () => ({ statusCode: 204, body: '' });

export const badRequest = (message: string) => ({
  statusCode: 400,
  body: JSON.stringify({ error: message }),
});

export const unauthorized = () => ({
  statusCode: 401,
  body: JSON.stringify({ error: 'Unauthorized' }),
});

export const forbidden = () => ({
  statusCode: 403,
  body: JSON.stringify({ error: 'Forbidden' }),
});

export const notFound = (resource = 'Resource') => ({
  statusCode: 404,
  body: JSON.stringify({ error: `${resource} not found` }),
});

export const serverError = (err?: unknown) => {
  console.error(err);
  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Internal server error' }),
  };
};
