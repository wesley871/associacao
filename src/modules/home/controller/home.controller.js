import { extrairCadastroDaImagem } from '../service/home.service.js'

export function redirectToLogin(req, res) {
  res.redirect('/login')
}

export function renderHome(req, res) {
  res.render('home', {}, (err, html) => {
    if (err) {
      res.status(500).send(err.message)
      return
    }

    res.status(200).send(html)
  })
}

export function renderCadastroAutomatico(req, res) {
  res.render('cadastro-automatico', {}, (err, html) => {
    if (err) {
      res.status(500).send(err.message)
      return
    }

    res.status(200).send(html)
  })
}

export async function processarImagem(req, res) {
  if (!req.file?.path) {
    res.status(400).json({
      error: 'Envie uma imagem para processar.'
    })
    return
  }

  try {
    const cadastro = await extrairCadastroDaImagem(req.file.path)
    res.status(200).json(cadastro)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({
      error: 'Não foi possível processar a imagem.'
    })
  }
}
