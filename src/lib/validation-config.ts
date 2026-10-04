import { z } from "zod";

// Evaluate before any application schema is constructed. Configuring this in
// main's body is too late: imported schemas may already probe dynamic code.
z.config({ jitless: true });
