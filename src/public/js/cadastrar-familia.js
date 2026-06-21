const cepInput = document.querySelector('#cep')
const cepStatus = document.querySelector('[data-cep-status]')
const familyMembers = document.querySelector('[data-family-members]')
const addFamilyMemberButton = document.querySelector('[data-add-family-member]')
const isEditForm = Boolean(document.querySelector('.family-edit-form'))

const addressFields = {
  logradouro: document.querySelector('#logradouro'),
  complemento: document.querySelector('#complemento'),
  unidade: document.querySelector('#unidade'),
  bairro: document.querySelector('#bairro'),
  localidade: document.querySelector('#localidade'),
  uf: document.querySelector('#uf'),
  estado: document.querySelector('#estado'),
  regiao: document.querySelector('#regiao'),
  ibge: document.querySelector('#ibge'),
  gia: document.querySelector('#gia'),
  ddd: document.querySelector('#ddd'),
  siafi: document.querySelector('#siafi')
}

function onlyNumbers(value = '') {
  return value.replace(/\D/g, '')
}

function setCepStatus(message = '') {
  if (cepStatus) {
    cepStatus.textContent = message
  }
}

function splitLogradouro(logradouro = '') {
  const [tipo = '', ...nome] = logradouro.trim().split(/\s+/)

  return {
    tipo,
    nome: nome.join(' ')
  }
}

function fillAddress(data) {
  Object.entries(addressFields).forEach(([field, input]) => {
    if (input) {
      input.value = data[field] ?? ''
    }
  })

  const tipoInput = document.querySelector('#tipo')
  const nomeInput = document.querySelector('#nome')
  const { tipo, nome } = splitLogradouro(data.logradouro)

  if (tipoInput && !tipoInput.value) {
    tipoInput.value = tipo
  }

  if (nomeInput && !nomeInput.value) {
    nomeInput.value = nome
  }
}

async function searchCep() {
  const cep = onlyNumbers(cepInput?.value ?? '')

  if (cep.length !== 8) {
    setCepStatus('')
    return
  }

  setCepStatus('Consultando CEP...')

  try {
    const response = await fetch(`/api/cep/${cep}`)
    const data = await response.json()

    if (!response.ok) {
      setCepStatus(data.error ?? 'CEP não encontrado.')
      return
    }

    fillAddress(data)
    setCepStatus('Endereço preenchido pelo ViaCEP.')
  } catch {
    setCepStatus('Não foi possível consultar o CEP.')
  }
}

function updateFamilyMembers() {
  const members = [...document.querySelectorAll('[data-family-member]')]

  members.forEach((member, index) => {
    const title = member.querySelector('h3')
    const removeButton = member.querySelector('[data-remove-family-member]')

    if (title) {
      title.textContent = `Familiar ${index + 1}`
    }

    if (removeButton) {
      removeButton.hidden = index === 0
    }
  })
}

function createFamilyMember() {
  const currentMembers = document.querySelectorAll('[data-family-member]')
  const index = currentMembers.length
  const member = document.createElement('article')

  member.className = isEditForm ? 'person-edit-card' : 'family-member'
  member.dataset.familyMember = ''

  if (isEditForm) {
    member.innerHTML = `
      <div class="person-card-header">
        <div>
          <h3>Novo familiar</h3>
          <span class="person-badge person-badge-muted">Novo</span>
        </div>

        <button type="button" class="danger-button" data-remove-family-member>Remover</button>
      </div>

      <input type="hidden" name="pessoaId" value="">

      <div class="form-grid form-grid-three">
        <label class="field-wide">
          <span>Nome completo</span>
          <input type="text" name="familiarNome" required>
        </label>

        <label>
          <span>CPF</span>
          <input type="text" name="familiarCpf" inputmode="numeric" required>
        </label>

        <label>
          <span>Nascimento</span>
          <input type="date" name="familiarNascimento" required>
        </label>
      </div>
    `

    return member
  }

  member.innerHTML = `
    <div class="member-title-row">
      <h3>Familiar ${index + 1}</h3>
      <button type="button" class="remove-member-button" data-remove-family-member>Remover</button>
    </div>

    <div class="form-grid form-grid-four">
      <label class="field-wide">
        <span>Nome completo</span>
        <input type="text" name="familiarNome" required>
      </label>

      <label>
        <span>CPF</span>
        <input type="text" name="familiarCpf" inputmode="numeric">
      </label>

      <label>
        <span>Nascimento</span>
        <input type="date" name="familiarNascimento">
      </label>

      <label>
        <span>Parentesco</span>
        <select name="familiarParentesco" required>
          <option value="">Selecione</option>
          <option value="Filho(a)">Filho(a)</option>
          <option value="Cônjuge ou companheiro(a)">Cônjuge ou companheiro(a)</option>
          <option value="Outros dependentes">Outros dependentes</option>
        </select>
      </label>
    </div>
  `

  return member
}

cepInput?.addEventListener('blur', searchCep)
cepInput?.addEventListener('input', () => {
  if (onlyNumbers(cepInput.value).length === 8) {
    searchCep()
  }
})

addFamilyMemberButton?.addEventListener('click', () => {
  familyMembers?.append(createFamilyMember())
  updateFamilyMembers()
})

familyMembers?.addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-remove-family-member]')

  if (!removeButton) {
    return
  }

  removeButton.closest('[data-family-member]')?.remove()
  updateFamilyMembers()
})

updateFamilyMembers()
