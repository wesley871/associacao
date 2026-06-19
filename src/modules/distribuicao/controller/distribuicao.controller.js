import {
  listarProjetosParaDistribuicao,
  obterDistribuicaoDoProjeto,
  registrarDistribuicao
} from '../service/distribuicao.service.js'

function redirectWithFeedback(res, path, feedback) {
  const status = feedback.ok ? 'success' : 'error'
  const message = encodeURIComponent(feedback.message)

  res.redirect(`${path}?${status}=${message}`)
}

export function renderDistribuicoes(req, res) {
  const projetos = listarProjetosParaDistribuicao()

  res.render('distribuicoes', {
    projetos,
    success: req.query.success ?? null,
    error: req.query.error ?? null
  }, (err, html) => {
    if (err) {
      res.status(500).send(err.message)
      return
    }

    res.status(200).send(html)
  })
}

export function renderDistribuicaoProjeto(req, res) {
  const distribuicao = obterDistribuicaoDoProjeto(req.params.idProjeto)

  if (!distribuicao) {
    res.redirect('/distribuicoes?error=Projeto%20ativo%20n%C3%A3o%20encontrado.')
    return
  }

  res.render('distribuicao-projeto', {
    ...distribuicao,
    success: req.query.success ?? null,
    error: req.query.error ?? null
  }, (err, html) => {
    if (err) {
      res.status(500).send(err.message)
      return
    }

    res.status(200).send(html)
  })
}

export function registrarRetirada(req, res) {
  const result = registrarDistribuicao({
    idCadastro: req.params.idCadastro,
    data: req.body.data
  })
  const idProjeto = result.idProjeto ?? req.params.idProjeto

  redirectWithFeedback(res, `/distribuicoes/${idProjeto}`, result)
}
