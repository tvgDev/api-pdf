import Fastify from "fastify";
import puppeteer from "puppeteer";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyJwt from "@fastify/jwt";
import "dotenv/config";

const fastify = Fastify({
  logger: true,
});

await fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "senha-provisoria-dev",
});

fastify.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Acesso negado: Token inválido ou ausente.",
    });
  }
});

await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: "API de PDF",
      description: "API para converter URLs em arquivos PDF.",
      version: "1.1.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});

await fastify.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
});

fastify.post(
  "/login",
  {
    schema: {
      description: "Faz login para receber o Token JWT",
      tags: ["Auth"],
      summary: "Obter Token de Acesso",
      body: {
        type: "object",
        required: ["usuario", "senha"],
        properties: {
          usuario: { type: "string", default: "admin" },
          senha: { type: "string", default: "123456" },
        },
      },
      response: {
        200: {
          description: "Token gerado com sucesso!",
          type: "object",
          properties: {
            token: { type: "string" },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const { usuario, senha } = request.body;

    const USUARIO_CORRETO = process.env.API_USER || "admin_provisorio";
    const SENHA_CORRETA = process.env.API_PASS || "senha_provisoria";
    const JWT_SECRET = process.env.JWT_SECRET || "segredo_padrao";

    if (usuario === USUARIO_CORRETO && senha === SENHA_CORRETA) {
      const token = fastify.jwt.sign(
        { usuario: usuario, cargo: "admin" },
        { expiresIn: process.env.TEMPO_EXPIRACAO || "30m" },
      );
      return { token };
    }

    return reply.code(401).send({ message: "Credenciais inválidas" });
  },
);

fastify.post(
  "/gerar-pdf",
  {
    onRequest: [fastify.authenticate],
    schema: {
      description: "Gera um PDF (Requer Token JWT)",
      tags: ["PDF"],
      summary: "Converte URL em PDF",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", format: "uri" },
          base64: { type: "boolean", default: false },
        },
      },
      response: {
        200: { description: "Sucesso" },
        401: {
          description: "Erro de Autenticação",
          type: "object",
          properties: {
            statusCode: { type: "integer" },
            error: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const { url, base64 } = request.body;
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.emulateMediaType("screen");

      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
      });

      if (base64) {
        const bufferReal = Buffer.from(pdfBuffer);
        const base64String = bufferReal.toString("base64");
        return reply.send({
          success: true,
          type: "base64",
          data: base64String,
        });
      }

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        'attachment; filename="documento.pdf"',
      );
      return reply.send(pdfBuffer);
    } catch (erro) {
      fastify.log.error(erro);
      return reply
        .code(500)
        .send({ error: "Erro ao criar PDF", detalhe: erro.message });
    } finally {
      if (browser) await browser.close();
    }
  },
);

fastify.get("/", async (request, reply) => {
  return reply.redirect("/docs");
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log(
      "Servidor rodando! Acesse a documentação em: https://api-pdf-k1w9.onrender.com/docs",
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
