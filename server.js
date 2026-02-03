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
      title: "API de PDF (Microserviço)",
      description: "API para converter URLs em arquivos PDF usando Puppeteer.",
      version: "1.0.0",
    },
    host: "localhost:3000",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/pdf"],
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
        },
      },
      response: {
        200: {
          description: "Arquivo PDF gerado com sucesso",
          type: "string",
          format: "binary",
        },
      },
    },
  },
  async (request, reply) => {
    const { url } = request.body;

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

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log(
      "Servidor rodando! Acesse a documentação em: http://localhost:3000/docs",
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
