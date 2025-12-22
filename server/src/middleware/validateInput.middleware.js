function validateInput(schema) {
  return (req, res, next) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (result.body) {
        req.body = result.body;
      }

      if (result.query) {
        // req.query might be a getter, so mutate the object reference
        for (const key in req.query) delete req.query[key];
        Object.assign(req.query, result.query);
      }
      // Do not replace req.params as they might be mapped differently or partial
      next();
    } catch (err) {
      if (err.errors) {
        const errors = err.errors.map((error) => error.message);
        return res.status(400).json({ validationErrors: errors });
      }
      console.error("Validation Middleware Error:", err);
      // Fallback for unexpected validation errors (validation failed but not standard ZodError?)
      return res.status(400).json({ error: "Invalid input data" });
    }
  };
}

module.exports = { validateInput };
