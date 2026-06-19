import {
  cadastrarProjeto,
  consultarProjetos,
  editarProjeto,
  excluirProjeto,
  incluirParticipante,
  obterProjetoDetalhado,
  removerParticipante
} from '../service/projeto.service.js'

function redirectWithFeedback(res, path, feedback) {
  const status = feedback.ok ? 'success' : 'error'
  const message = encodeURIComponent(feedback.message)

  res.redirect(`${path}?${status}=${message}`)
}

export function renderProjetos(req, res) {
  const search = req.query.busca ?? ''
  const projetos = consultarProjetos(search)

  res.render('projetos', {
    projetos,
    search,
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

export function renderNovoProjeto(req, res) {
  res.render('projeto-form', {
    projeto: null,
    formAction: '/projetos/novo',
    title: 'Novo projeto',
    submitLabel: 'Cadastrar projeto',
    success: null,
    error: req.query.error ?? null
  }, (err, html) => {
    if (err) {
      res.status(500).send(err.message)
      return
    }

    res.status(200).send(html)
  })
}

export function criarProjeto(req, res) {
  const result = cadastrarProjeto(req.body)

  if (!result.ok) {
    redirectWithFeedback(res, '/projetos/novo', result)
    return
  }

  redirectWithFeedback(res, `/projetos/${result.projeto.id}`, result)
}

export function renderDetalheProjeto(req, res) {
  const projeto = obterProjetoDetalhado(req.params.id)

  if (!projeto) {
    res.redirect('/projetos?error=Projeto%20n%C3%A3o%20encontrado.')
    return
  }

  res.render('projeto-detalhe', {
    projeto,
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

export function renderEditarProjeto(req, res) {
  const projeto = obterProjetoDetalhado(req.params.id)

  if (!projeto) {
    res.redirect('/projetos?error=Projeto%20n%C3%A3o%20encontrado.')
    return
  }

  res.render('projeto-form', {
    projeto,
    formAction: `/projetos/${projeto.id}/editar`,
    title: 'Editar projeto',
    submitLabel: 'Salvar alterações',
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

export function atualizarProjeto(req, res) {
  const result = editarProjeto({
    id: req.params.id,
    ...req.body
  })

  redirectWithFeedback(res, result.ok ? `/projetos/${req.params.id}` : `/projetos/${req.params.id}/editar`, result)
}

export function inativarProjeto(req, res) {
  const result = excluirProjeto(req.params.id)

  redirectWithFeedback(res, result.ok ? '/projetos' : `/projetos/${req.params.id}`, result)
}

export function adicionarParticipante(req, res) {
  const result = incluirParticipante({
    idProjeto: req.params.id,
    cpf: req.body.cpf,
    inicio: req.body.inicio
  })

  redirectWithFeedback(res, `/projetos/${req.params.id}`, result)
}

export function inativarParticipante(req, res) {
  const result = removerParticipante({
    idProjeto: req.params.id,
    idCadastro: req.params.idCadastro
  })

  redirectWithFeedback(res, `/projetos/${req.params.id}`, result)
}
