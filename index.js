const express = require('express');
const app = express();
const port = 8000;
const db = require('./connections/dataBase');

app.get('/somaPagamento', (req, res) => {
  const query = `
    SELECT i.idImovel, i.descricaoImovel, p.valorPagamento
    FROM imovel i
    LEFT JOIN pagamento p ON i.idImovel = p.idImovel
  `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send('Erro ao consultar o banco de dados');
      return;
    }

    const imoveisMap = results.reduce((acc, row) => {
      const valor = parseFloat(row.valorPagamento) || 0;
        //Transforma uma lista de objetos para agregar informações
      if (!acc[row.idImovel]) {
        acc[row.idImovel] = {
          idImovel: row.idImovel,
          descricaoImovel: row.descricaoImovel,
          totalPagamentos: 0
        };
      }
      //adiciona valor do pagamento ao imovel
      acc[row.idImovel].totalPagamentos += valor;
      return acc;
    }, {});

    //Objeto para array
    const imoveis = Object.values(imoveisMap);

    res.json({ imoveis });
  });
});

app.get('/totalVendas', (req, res) => {
  const query = `
    SELECT dataPagamento, valorPagamento
    FROM pagamento
  `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send('Erro ao consultar o banco de dados');
      return;
    }

    const vendasPorPeriodo = results.reduce((acc, row) => {
      const dataStr = row.dataPagamento;
      let periodo;

      // verifica dataPagamento é no formato 'YYYY-MM-DD'
      if (typeof dataStr === 'string' && dataStr.length >= 7) {
        periodo = dataStr.slice(0, 7); // pega ano e mês
      } else {
        // se dataPagamento for objeto do tipo Date ele converte pra string
        const dataObj = new Date(dataStr);
        periodo = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}`;
      }
      //acc = acumulador
      if (!acc[periodo]) {
        acc[periodo] = 0;
      }

      // soma do pagamento com total do período
      acc[periodo] += parseFloat(row.valorPagamento) || 0;

      return acc;
    }, {});

    // Converte o objeto de períodos em um array
    const vendas = Object.keys(vendasPorPeriodo).map(periodo => ({
      periodo,
      totalVendas: vendasPorPeriodo[periodo]
    }));

    // return com os dados do metodo acc(acumulados com a lógica de soma)
    res.json({ vendas });
  });
});

app.get('/percentual', (req, res) => {
  const query = `
    SELECT ti.descricaoTipoImovel, SUM(p.valorPagamento) AS totalVendas
    FROM pagamento p
    JOIN imovel i ON p.idImovel = i.idImovel
    JOIN tipo_imovel ti ON i.idTipoImovel = ti.idTipoImovel
    GROUP BY ti.descricaoTipoImovel
  `;
    //verifica o erro(se houver)
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send('Erro ao consultar o banco de dados');
      return;
    }
    // Calcula o total geral de vendas
    if (results.length === 0) {
      res.json({ tiposImovel: [] });
      return;
    }

    const totalVendasGeral = results.reduce((acc, row) => {
      const valor = parseFloat(row.totalVendas) || 0;//parsefloat para passar os dados do banco para float
      return acc + valor;
    }, 0);

    if (totalVendasGeral === 0) {
      res.json({ tiposImovel: results.map(row => ({
        tipoImovel: row.descricaoTipoImovel,
        totalVendas: (parseFloat(row.totalVendas) || 0).toFixed(2),
        percentual: 0
      })) });
      return;
    }
    // Calcula o percentual de vendas por tipo de imóvel
    const tiposImovel = results.map(row => {
      const totalVendas = parseFloat(row.totalVendas) || 0;
      const percentual = (totalVendas / totalVendasGeral) * 100;
      return {
        tipoImovel: row.descricaoTipoImovel,
        totalVendas: totalVendas.toFixed(2),
        percentual: percentual.toFixed(2)//toFixed para reduzir as casas decimais.
      };
    });
    // Responde com os dados agregados
    res.json({ tiposImovel });
  });
});

// Inicia o servidor
app.listen(port, () => {
  console.log('Servidor iniciado com sucesso!');
});
