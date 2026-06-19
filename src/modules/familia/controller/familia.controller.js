import {
  buildFamiliaFromForm,
  buildFamiliaEditFromForm,
  cadastrarFamilia as saveCadastroFamilia,
  consultarCep,
  consultarFamilias,
  editarFamilia,
  inativarPessoaDaFamilia,
  obterFamilia
} from '../service/familia.service.js'

function redirectWithFeedback(res, path, feedback) {
  const status = feedback.ok ? 'success' : 'error'
  const message = encodeURIComponent(feedback.message)

  res.redirect(`${path}?${status}=${message}`)
}

function renderForm(res, data = {}) {
  res.render('cadastrar-familia', {
    success: null,
    error: null,
    cadastro: null,
    ...data
  }, (err, html) => {
    if (err) {
      res.status(500).send(err.message)
      return
    }

    res.status(200).send(html)
  })
}

export function renderCadastrarFamilia(req, res) {
  renderForm(res, {
    success: req.query.success ?? null,
    error: req.query.error ?? null
  })
}

export function cadastrarFamilia(req, res) {
  const cadastro = buildFamiliaFromForm(req.body)
  const hasInvalidFamiliar = cadastro.familiares.some((familiar) => {
    return !familiar.nomeCompleto || !familiar.cpf || !familiar.nascimento
  })

  if (!cadastro.codigoFamiliar || !cadastro.dataEntrevista || !cadastro.folhaResumo || !cadastro.telefoneResponsavel || cadastro.familiares.length === 0) {
    renderForm(res, {
      error: 'Informe o código familiar, a data da entrevista, a folha resumo, o telefone do responsável e pelo menos um familiar.',
      cadastro
    })
    return
  }

  if (hasInvalidFamiliar) {
    renderForm(res, {
      error: 'Informe nome, CPF e nascimento para todos os familiares.',
      cadastro
    })
    return
  }

  const result = saveCadastroFamilia(cadastro)

  renderForm(res, {
    success: result.ok ? result.message : null,
    error: result.ok ? null : result.message,
    cadastro
  })
}

export async function buscarCep(req, res) {
  try {
    const result = await consultarCep(req.params.cep)
    res.status(result.status).json(result.data)
  } catch {
    res.status(502).json({
      error: 'Não foi possível consultar o ViaCEP agora.'
    })
  }
}

export function renderConsultarFamilias(req, res) {
  const search = req.query.busca ?? ''
  const familias = consultarFamilias(search)

  res.render('consultar-familias', {
    familias,
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

export function renderEditarFamilia(req, res) {
  const familia = obterFamilia(req.params.codigoFamiliar)

  if (!familia) {
    res.redirect('/consultar?error=Fam%C3%ADlia%20n%C3%A3o%20encontrada.')
    return
  }

  res.render('editar-familia', {
    familia,
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

export function atualizarFamilia(req, res) {
  const cadastro = buildFamiliaEditFromForm(req.body)
  const result = editarFamilia(req.params.codigoFamiliar, cadastro)
  const nextCodigo = result.familia?.codigoFamiliar ?? req.params.codigoFamiliar

  redirectWithFeedback(res, `/familias/${nextCodigo}`, result)
}

export function inativarPessoa(req, res) {
  const result = inativarPessoaDaFamilia({
    codigoFamiliar: req.params.codigoFamiliar,
    idPessoa: req.params.idPessoa
  })

  redirectWithFeedback(res, `/familias/${req.params.codigoFamiliar}`, result)
}
