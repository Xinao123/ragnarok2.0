// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

// NextAuth cuida dos métodos GET/POST dessa rota
export const { GET, POST } = handlers;
