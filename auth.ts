// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DUMMY_HASH = bcrypt.hashSync("ragnarok_dummy_password", 10);

export const { auth, handlers, signIn, signOut } = NextAuth({
    pages: {
        signIn: "/auth/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 dias
        updateAge: 24 * 60 * 60,  // revalida a cada 24h
    },
    jwt: {
        maxAge: 7 * 24 * 60 * 60,
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                username: { label: "Usuario", type: "text" },
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
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = (user as any).id;
                token.username = (user as any).name;
                token.iat = Math.floor(Date.now() / 1000);
            }

           
            if (trigger === "update") {
                token.iat = Math.floor(Date.now() / 1000);
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
