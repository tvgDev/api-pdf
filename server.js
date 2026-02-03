import Fastify from "fastify";
import puppeteer from "puppeteer";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

const fastify = Fastify({
  logger: true,
});

await fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: "API de PDF",
      description:
        "API para converter URLs em arquivos PDF (Download ou Base64).",
      version: "1.1.0",
    },
    schemes: ["http", "https"],
    consumes: ["application/json"],
  },
});

await fastify.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
});

fastify.post(
  "/gerar-pdf",
  {
    schema: {
      description: "Gera um PDF a partir de uma URL informada",
      tags: ["PDF"],
      summary: "Converte URL em PDF",
      body: {
        type: "object",
        required: ["url"],
        properties: {
          url: {
            type: "string",
            format: "uri",
            description: "A URL completa da página que será convertida",
          },
          base64: {
            type: "boolean",
            default: false,
            description:
              "Se true, retorna o PDF em formato Base64 (JSON). Se false, baixa o arquivo.",
          },
        },
      },
      response: {
        200: {
          description: "Sucesso",
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
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      await page.setViewport({ width: 1920, height: 1080 });
      await page.emulateMediaType("screen");
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

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
