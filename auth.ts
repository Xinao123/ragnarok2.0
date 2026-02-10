// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DUMMY_HASH = bcrypt.hashSync("ragnarok_dummy_password", 10);

export const { auth, handlers, signIn, signOut } = NextAuth({
    pages: {
        // nossa página de login custom
        signIn: "/auth/login",
    },
    session: {
        strategy: "jwt",
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                username: { label: "Usuário", type: "text" },
                password: { label: "Senha", type: "password" },
            },
            async authorize(credentials) {
                if (
                    !credentials ||
                    typeof credentials.username !== "string" ||
                    typeof credentials.password !== "string"
                ) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username },
                });

                if (!user || !user.passwordHash) {
                    // evita timing attacks por usuÃ¡rio inexistente
                    await bcrypt.compare(credentials.password, DUMMY_HASH);
                    return null;
                }

                const isValid = await bcrypt.compare(
                    credentials.password,
                    user.passwordHash,
                );

                if (!isValid) return null;

                // Esse objeto vira `session.user`
                return {
                    id: String(user.id),
                    name: user.username,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // roda quando o usuário loga / JWT é criado
            if (user) {
                token.id = (user as any).id;
                token.username = (user as any).name;
            }
            return token;
        },
        async session({ session, token }) {
            // aqui copiamos dados do token pra session.user
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).username = (token as any).username;
            }
            return session;
        },
    },
});
