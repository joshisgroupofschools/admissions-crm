const output = document.querySelector('#output')
const urlInput = document.querySelector('#url')
const savedUrl = localStorage.getItem('gas-proof-url')
urlInput.value = savedUrl || 'https://script.google.com/macros/s/AKfycbyNkj_IXf5R6M2WuUdisBTRFgajKo4UsYBDC_plx1ij6E0KttNs7dZ-l7kD9bXADtQyyA/exec'

function show(value) {
  output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function endpoint() {
  const url = urlInput.value.trim()
  if (!url.startsWith('https://script.google.com/macros/s/') || !url.endsWith('/exec')) {
    throw new Error('Enter a deployed Apps Script /exec URL.')
  }
  localStorage.setItem('gas-proof-url', url)
  return url
}

async function request(action, value) {
  const url = endpoint()
  const requestId = crypto.randomUUID()
  let response
  if (action === 'read') {
    const target = new URL(url)
    target.searchParams.set('action', 'read')
    target.searchParams.set('requestId', requestId)
    response = await fetch(target, {method: 'GET', redirect: 'follow'})
  } else {
    // text/plain is a CORS-safelisted content type and avoids OPTIONS preflight.
    // The server explicitly parses JSON from e.postData.contents.
    response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=UTF-8'},
      body: JSON.stringify({action, requestId, value: value || `browser-${Date.now()}`}),
      redirect: 'follow',
    })
  }
  const text = await response.text()
  let body
  try { body = JSON.parse(text) } catch { throw new Error(`Non-JSON response (${response.status}): ${text.slice(0, 500)}`) }
  return {httpStatus: response.status, redirectedUrl: response.url, body}
}

function withoutLegacyRowCount(response) {
  const body = response.body
  if (body?.result && Object.hasOwn(body.result, 'rows') && !Array.isArray(body.result.rows)) {
    const result = {...body.result}
    delete result.rows
    return {...response, body: {...body, result}}
  }
  return response
}

document.querySelectorAll('button[data-test]').forEach(button => {
  button.addEventListener('click', async () => {
    const test = button.dataset.test
    show(`Running ${test}…`)
    try {
      if (test === 'concurrent') {
        const results = await Promise.all([
          request('write', `parallel-A-${crypto.randomUUID()}`),
          request('write', `parallel-B-${crypto.randomUUID()}`),
        ])
        const readAfter = await request('read')
        show({test, results: results.map(withoutLegacyRowCount), verifiedRows: readAfter.body?.result?.rows?.length, readAfter})
      } else if (test === 'write') {
        const write = await request(test, `browser-${crypto.randomUUID()}`)
        const readAfter = await request('read')
        show({write: withoutLegacyRowCount(write), verifiedRows: readAfter.body?.result?.rows?.length, readAfter})
      } else {
        show(await request(test, `browser-${crypto.randomUUID()}`))
      }
    } catch (error) {
      show({test, browserError: error.message, hint: 'A CORS/network error means the browser could not read the API response. Check the Apps Script deployment and origin.'})
    }
  })
})
