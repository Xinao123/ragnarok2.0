import { z } from "zod";
import { sanitizeFull } from "@/lib/sanitize";

// =============================
// USER & AUTH SCHEMAS
// =============================

/**
 * Validação de senha forte
 */
export const PasswordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(128, "Senha muito longa (máx. 128)")
  .regex(/[A-Z]/, "Precisa ter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Precisa ter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Precisa ter pelo menos um número")
  .regex(
    /[^A-Za-z0-9]/,
    "Precisa ter pelo menos um caractere especial (!@#$%^&*)"
  );

/**
 * Validação de username
 */
export const UsernameSchema = z
  .string()
  .min(3, "Username deve ter no mínimo 3 caracteres")
  .max(20, "Username muito longo (máx. 20)")
  .regex(
    /^[a-z0-9_]+$/,
    "Username só pode ter letras minúsculas, números e _"
  )
  .refine(
    (val) => !["admin", "root", "moderator", "system"].includes(val),
    "Username reservado"
  );

/**
 * Schema de registro
 */
export const RegisterSchema = z
  .object({
    username: UsernameSchema,
    email: z.string().email("Email inválido"),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

/**
 * Schema de login
 */
export const LoginSchema = z.object({
  username: z.string().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});

/**
 * Schema de atualização de perfil
 */
export const ProfileUpdateSchema = z.object({
  name: z
    .string()
    .max(50, "Nome muito longo (máx. 50)")
    .optional()
    .nullable(),

  bio: z
    .string()
    .max(500, "Bio muito longa (máx. 500)")
    .optional()
    .nullable(),
});

// =============================
// LOBBY SCHEMAS
// =============================

/**
 * Schema de criação de lobby
 */
export const LobbyCreateSchema = z.object({
  title: z
    .string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(80, "Título muito longo (máx. 80)")
    .trim()
    .regex(
      /^[a-zA-Z0-9\s\-_!?À-ÿ]+$/,
      "Caracteres inválidos no título"
    ),

  description: z
    .string()
    .max(500, "Descrição muito longa (máx. 500)")
    .trim()
    .optional()
    .nullable(),

  maxPlayers: z
    .number()
    .int("Deve ser um número inteiro")
    .min(2, "Mínimo 2 jogadores")
    .max(16, "Máximo 16 jogadores"),

  gameId: z.string().uuid("ID de jogo inválido").optional(),

  rawgId: z.number().int().positive().optional(),

  language: z
    .string()
    .max(10)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Formato inválido. Use: pt-BR, en, es")
    .optional()
    .nullable(),

  region: z
    .string()
    .max(5)
    .regex(/^[A-Z]{2,5}$/, "Formato inválido. Use: BR, NA, EU")
    .optional()
    .nullable(),
});

/**
 * Schema de atualização de lobby
 */
export const LobbyUpdateSchema = z.object({
  title: z
    .string()
    .min(3)
    .max(80)
    .trim()
    .optional(),

  description: z
    .string()
    .max(500)
    .trim()
    .optional()
    .nullable(),

  maxPlayers: z
    .number()
    .int()
    .min(2)
    .max(16)
    .optional(),

  status: z.enum(["OPEN", "FULL", "CLOSED"]).optional(),

  language: z
    .string()
    .max(10)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .optional()
    .nullable(),

  region: z
    .string()
    .max(5)
    .regex(/^[A-Z]{2,5}$/)
    .optional()
    .nullable(),
});

// =============================
// MESSAGE SCHEMAS
// =============================

/**
 * Schema de mensagem DM
 */
export const DMMessageSchema = z.object({
  conversationId: z.string().uuid("ID de conversa inválido"),

  content: z
    .string()
    .min(1, "Mensagem não pode ser vazia")
    .max(2000, "Mensagem muito longa (máx. 2000 caracteres)")
    .trim()
    .refine(
      (val) => val.length > 0,
      "Mensagem não pode conter apenas espaços"
    ),
});

/**
 * Schema de mensagem de lobby
 */
export const LobbyMessageSchema = z.object({
  lobbyId: z.string().cuid("ID de lobby inválido"),

  content: z
    .string()
    .min(1, "Mensagem não pode ser vazia")
    .max(1000, "Mensagem muito longa (máx. 1000)")
    .trim()
    .transform((val) => sanitizeFull(val))
    .refine(
      (val) => val.length > 0,
      "Mensagem não pode ser vazia após sanitização"
    ),
});

// =============================
// FRIEND SCHEMAS
// =============================

/**
 * Schema de pedido de amizade
 */
export const FriendRequestSchema = z.object({
  targetUserId: z.string().uuid("ID de usuário inválido"),
});

/**
 * Schema de resposta a pedido de amizade
 */
export const FriendResponseSchema = z.object({
  requestId: z.string().uuid("ID de pedido inválido"),
  action: z.enum(["ACCEPT", "DECLINE"], {
    errorMap: () => ({ message: "Ação inválida" }),
  }),
});

// =============================
// GAME SCHEMAS
// =============================

/**
 * Schema de importação de jogo da RAWG
 */
export const ImportGameSchema = z.object({
  rawgId: z.number().int().positive("ID da RAWG inválido"),
  name: z.string().min(1).max(100),
  platforms: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  backgroundImageUrl: z.string().url().optional().nullable(),
});

// =============================
// STATUS SCHEMAS
// =============================

/**
 * Schema de status de usuário
 */
export const StatusSchema = z.object({
  status: z.enum(["ONLINE", "AWAY", "BUSY", "INVISIBLE", "OFFLINE"], {
    errorMap: () => ({
      message: "Status inválido. Use: ONLINE, AWAY, BUSY, INVISIBLE, OFFLINE",
    }),
  }),
});

// =============================
// FILE UPLOAD SCHEMAS
// =============================

/**
 * Validação de avatar
 */
export const AvatarSchema = z.custom<File>((file) => {
  if (!(file instanceof File)) return false;

  // Tamanho máximo: 2MB
  if (file.size > 2 * 1024 * 1024) return false;

  // Formatos permitidos
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) return false;

  return true;
}, "Imagem inválida. Use JPG, PNG ou WEBP com no máximo 2MB");

// =============================
// SEARCH SCHEMAS
// =============================

/**
 * Schema de busca de players
 */
export const PlayerSearchSchema = z.object({
  query: z
    .string()
    .min(2, "Digite pelo menos 2 caracteres")
    .max(50, "Busca muito longa")
    .trim(),
});

/**
 * Schema de busca de jogos
 */
export const GameSearchSchema = z.object({
  query: z
    .string()
    .min(2, "Digite pelo menos 2 caracteres")
    .max(100, "Busca muito longa")
    .trim(),

  page: z.number().int().min(1).max(100).default(1),

  pageSize: z.number().int().min(1).max(50).default(12),
});

// =============================
// HELPER TYPES
// =============================

// Export types para uso em TypeScript
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type LobbyCreateInput = z.infer<typeof LobbyCreateSchema>;
export type LobbyUpdateInput = z.infer<typeof LobbyUpdateSchema>;
export type DMMessageInput = z.infer<typeof DMMessageSchema>;
export type FriendRequestInput = z.infer<typeof FriendRequestSchema>;
export type FriendResponseInput = z.infer<typeof FriendResponseSchema>;
export type StatusInput = z.infer<typeof StatusSchema>;
