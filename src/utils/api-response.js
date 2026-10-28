/**
 * Standardised API response helpers.
 * Every endpoint returns { success, data|error, meta }.
 */

export function successResponse(res, data, statusCode = 200, meta = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      requestId: res.req.requestId,
      ...meta,
    },
  });
}

export function errorResponse(res, code, message, statusCode = 400, details = null) {
  const body = {
    success: false,
    error: { code, message },
    meta: {
      requestId: res.req?.requestId || 'unknown',
    },
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

export function paginatedResponse(res, data, page, limit, total) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      requestId: res.req.requestId,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}
