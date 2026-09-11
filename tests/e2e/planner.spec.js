import { test, expect } from '@playwright/test'
import { csv, pokemonResponse } from '../fixtures.js'

async function mockData(page) {
  await page.route('**/data/v2/csv/*.csv', (route) => {
    const body = csv[route.request().url().split('/').at(-1)]
    return route.fulfill({ status: body ? 200 : 404, contentType: 'text/csv', body: body ?? '' })
  })
  await page.route('https://pokeapi.co/api/v2/pokemon/*', (route) => {
    const data = pokemonResponse(route.request().url().split('/').at(-1))
    return route.fulfill({ status: data ? 200 : 404, json: data })
  })
}
async function add(page, name, slot = 1) {
  await page.getByRole('button', { name: `Add Pokémon to slot ${slot}`, exact: true }).click()
  await page.getByRole('searchbox').fill(name)
  await page.locator('.search-card').filter({ hasText: name }).click()
  await expect(page.getByRole('button', { name: `Inspect ${name}`, exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => { await mockData(page) })

test('build, autosave, share and manage named teams', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await add(page, 'pikachu')
  await page.getByLabel('Plan for a game').selectOption('1')
  await page.getByText('Saved teams (0)', { exact: true }).click()
  await page.getByLabel('Save a new team').fill('Kanto party')
  await page.getByRole('button', { name: 'Save team', exact: true }).click()
  await expect(page.getByText('Saved teams (1)', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Inspect pikachu', exact: true })).toBeVisible()
  await expect(page.getByLabel('Plan for a game')).toHaveValue('1')
  await page.getByRole('button', { name: 'Copy team link', exact: true }).click()
  const link = await page.getByLabel('Team sharing link').inputValue()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Inspect pikachu', exact: true })).toHaveCount(0)
  await page.goto(link)
  await expect(page.getByRole('button', { name: 'Inspect pikachu', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await page.getByText('Saved teams (1)', { exact: true }).click()
  await page.getByLabel('Your teams').selectOption({ label: 'Kanto party' })
  await page.getByRole('button', { name: 'Load team', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Inspect pikachu', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete saved team', exact: true }).click()
  await expect(page.getByText('Saved teams (0)', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('suggestions explain choices, add once, and random teams apply', async ({ page }) => {
  await page.goto('/')
  await add(page, 'pikachu')
  await page.getByRole('button', { name: 'Suggest a teammate' }).click()
  await expect(page.locator('.suggestion-reasons').first()).toBeVisible()
  await expect(page.locator('.suggestion-list')).toContainText('ground')
  await page.locator('.suggestion-list button').first().click()
  await expect(page.getByText('2/6 slots filled')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Random team', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Apply team', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Apply team', exact: true }).click()
  await expect(page.locator('.filled-slot')).toHaveCount(6)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('historical typing, incompatibility warnings and immunity display', async ({ page }) => {
  await page.goto('/')
  await add(page, 'clefairy')
  await page.getByLabel('Plan for a game').selectOption('1')
  await expect(page.locator('.filled-slot').getByLabel('normal', { exact: true })).toBeVisible()
  await expect(page.locator('.matchups')).toContainText('0×')
  await page.getByLabel('Plan for a game').selectOption('')
  await expect(page.locator('.filled-slot').getByLabel('fairy', { exact: true })).toBeVisible()
  await add(page, 'espeon', 2)
  await page.getByLabel('Plan for a game').selectOption('1')
  await expect(page.getByText('Introduced in a later generation')).toBeVisible()
})

test('late search responses cannot overwrite a newer search', async ({ page }) => {
  let release, started
  const waiting = new Promise((resolve) => { release = resolve })
  const requested = new Promise((resolve) => { started = resolve })
  await page.route('**/pokemon_stats.csv', async (route) => { started(); await waiting; await route.fulfill({ contentType: 'text/csv', body: csv['pokemon_stats.csv'] }) })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Pokémon to slot 1', exact: true }).click()
  await page.getByText('More filters', { exact: true }).click()
  await page.getByLabel('Sort by').selectOption('bst')
  await requested
  await page.getByRole('searchbox').fill('pikachu')
  await page.getByLabel('Sort by').selectOption('id')
  await expect(page.locator('.search-card')).toHaveCount(1)
  const response = page.waitForResponse('**/pokemon_stats.csv')
  release()
  await response
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.locator('.search-card')).toHaveCount(1)
  await expect(page.locator('.search-card')).toContainText('pikachu')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Add Pokémon to slot 1', exact: true })).toBeFocused()
})

test('closing a dialog prevents an in-flight selection from changing the team', async ({ page }) => {
  let release, started
  const waiting = new Promise((resolve) => { release = resolve })
  const requested = new Promise((resolve) => { started = resolve })
  await page.route('**/api/v2/pokemon/25', async (route) => { started(); await waiting; await route.fulfill({ json: pokemonResponse(25) }) })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Pokémon to slot 1', exact: true }).click()
  await page.getByRole('searchbox').fill('pikachu')
  await page.locator('.search-card').click()
  await requested
  await page.keyboard.press('Escape')
  const response = page.waitForResponse('**/api/v2/pokemon/25')
  release(); await response
  await expect(page.locator('.filled-slot')).toHaveCount(0)
})

test('storage failures and invalid links preserve a usable draft', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Storage blocked') } })
  await page.goto('/#team=bad&v=1')
  await expect(page.getByText(/Could not open the shared team/)).toBeVisible()
  await add(page, 'pikachu')
  await expect(page.getByText(/Automatic saving is unavailable/)).toBeVisible()
  await page.getByRole('button', { name: 'Copy team link', exact: true }).click()
  await expect(page.getByLabel('Team sharing link')).toBeVisible()
})


test('Escape closes a populated search input and restores keyboard focus', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: 'Add Pokémon to slot 1', exact: true })
  await opener.click()
  await page.getByRole('searchbox').fill('pikachu')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
})
