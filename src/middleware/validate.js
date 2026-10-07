import { z } from "zod";

// Validates req[source] against a zod schema and replaces it with the parsed (sanitized) value.
export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const { formErrors, fieldErrors } = z.flattenError(result.error);
    return res.status(400).json({
      error: formErrors[0] ?? Object.values(fieldErrors).flat()[0] ?? "Invalid request",
      fields: fieldErrors,
    });
  }
  // Express 5 makes req.query a getter, so store parsed values on req.validated.
  req.validated = { ...req.validated, [source]: result.data };
  if (source === "body") req.body = result.data;
  next();
};
