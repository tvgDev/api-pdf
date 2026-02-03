import Fastify from "fastify";
import puppeteer from "puppeteer";

const fastify = Fastify({
  logger: true,
});

fastify.post("/gerar-pdf", async (request, reply) => {
  const { url } = request.body;

  if (!url) {
    return reply.code(400).send({ error: "Você precisa enviar uma URL!" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
    });

    reply.header("Content-Type", "application/pdf");
    return reply.send(pdfBuffer);
  } catch (erro) {
    fastify.log.error(erro);
    return reply
      .code(500)
      .send({ error: "Erro ao criar PDF", detalhe: erro.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Servidor rodando no Docker na porta 3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
