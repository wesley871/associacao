import {
  buildPreCadastroFromForm,
  cadastrarPreCadastro,
  concluirPreCadastro,
  consultarPreCadastros,
  editarPreCadastro,
  obterPreCadastro
} from '../service/pre-cadastro.service.js'

function renderForm(res, data = {}) {
  res.render('pre-cadastro', {
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

export function renderPreCadastro(req, res) {
  renderForm(res, {
    success: req.query.success ?? null,
    error: req.query.error ?? null
  })
}

export async function criarPreCadastro(req, res) {
  const cadastro = buildPreCadastroFromForm(req.body)

  try {
    const result = await cadastrarPreCadastro(cadastro)

    renderForm(res, {
      success: result.message,
      cadastro: null
    })
  } catch (error) {
    console.error(error.message)
    renderForm(res, {
      error: 'Não foi possível salvar o pré-cadastro.',
      cadastro
    })
  }
}

export async function renderConsultarPreCadastros(req, res) {
  const search = req.query.busca ?? ''
  const preCadastros = await consultarPreCadastros(search)

  res.render('consultar-pre-cadastros', {
    preCadastros,
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

export async function renderEditarPreCadastro(req, res) {
  const cadastro = await obterPreCadastro(req.params.id)

  if (!cadastro) {
    res.redirect('/pre-cadastros?error=Pr%C3%A9-cadastro%20n%C3%A3o%20encontrado.')
    return
  }

  res.render('editar-pre-cadastro', {
    cadastro,
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

export async function atualizarPreCadastro(req, res) {
  const cadastro = buildPreCadastroFromForm(req.body)
  const result = await editarPreCadastro(req.params.id, cadastro)
  const status = result.ok ? 'success' : 'error'

  res.redirect(`/pre-cadastros/${req.params.id}?${status}=${encodeURIComponent(result.message)}`)
}

export async function moverParaCadastroCompleto(req, res) {
  const result = await concluirPreCadastro(req.params.id)

  if (result.ok) {
    res.redirect(`/familias/${result.codigoFamiliar}?success=${encodeURIComponent(result.message)}`)
    return
  }

  res.redirect(`/pre-cadastros/${req.params.id}?error=${encodeURIComponent(result.message)}`)
}
