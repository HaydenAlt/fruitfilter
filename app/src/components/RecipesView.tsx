import { useEffect, useState } from 'react'
import { allergenKey, checkAllergens, ingredientConflicts } from '../lib/allergens'
import { fetchRecipes } from '../lib/api'
import { useLang, useT, type StringKey } from '../lib/i18n'
import { getCachedRecipes, setCachedRecipes } from '../lib/storage'
import type { Goal, Recipe, RecipeBundle, ScanRecord } from '../lib/types'

interface RecipesViewProps {
  record: ScanRecord
  allergies: string[]
  onBack: () => void
}

const GOALS: { id: Goal; key: 'goalAny' | 'goalProtein' | 'goalSugar' }[] = [
  { id: 'any', key: 'goalAny' },
  { id: 'high-protein', key: 'goalProtein' },
  { id: 'low-sugar', key: 'goalSugar' },
]

type Status = 'loading' | 'ready' | 'error'

export function RecipesView({ record, allergies, onBack }: RecipesViewProps) {
  const t = useT()
  const lang = useLang()
  const [goal, setGoal] = useState<Goal>('any')
  const [bundle, setBundle] = useState<RecipeBundle | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  const fruit = record.analysis.fruit
  const fruitName = record.analysis.display_name || fruit
  const cacheKey = `${fruit}|${goal}|${lang}|${[...allergies].sort().join(',')}`

  useEffect(() => {
    const cached = getCachedRecipes(cacheKey)
    if (cached) {
      setBundle(cached)
      setStatus('ready')
      setError('')
      return
    }

    let cancelled = false
    setStatus('loading')
    setError('')

    fetchRecipes({
      fruit,
      ripeness: record.analysis.ripeness,
      lang,
      goal,
      allergies,
    })
      .then((result) => {
        if (cancelled) return
        const next: RecipeBundle = { fruit, goal, lang, recipes: result.recipes }
        setCachedRecipes(cacheKey, next)
        setBundle(next)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setError(t('recipesError'))
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, fruit, goal, lang, allergies, record.analysis.ripeness, reload, t])

  const fruitConflicts = checkAllergens(fruit, allergies)

  return (
    <section className="view" aria-labelledby="recipes-title">
      <div className="view-head">
        <button type="button" className="back-button" onClick={onBack} data-testid="back">
          <BackIcon />
          {t('back')}
        </button>
        <p className="eyebrow">{t('recipesTitle')}</p>
        <h1 id="recipes-title">{t('recipesFor', { fruit: fruitName })}</h1>
        <p className="muted">{t('recipesIntro')}</p>
      </div>

      {fruitConflicts.length > 0 && (
        <div className="alert" role="alert">
          <p className="alert-title">{t('allergenWarning')}</p>
          {fruitConflicts.map((id) => (
            <p key={id} className="alert-inline">
              {t(`warn_${allergenKey(id)}_detail` as StringKey)}
            </p>
          ))}
          <p className="alert-fine">{t('disclaimer')}</p>
        </div>
      )}

      <div className="segmented" role="group" aria-label={t('recipesTitle')}>
        {GOALS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`segment ${goal === item.id ? 'segment-active' : ''}`}
            aria-pressed={goal === item.id}
            onClick={() => setGoal(item.id)}
            data-testid={`goal-${item.id}`}
          >
            {t(item.key)}
          </button>
        ))}
      </div>

      <div className="visually-hidden" role="status" aria-live="polite">
        {status === 'loading' ? t('recipesLoading') : ''}
      </div>

      {status === 'loading' && (
        <div className="recipe-list" aria-hidden="true">
          <div className="card recipe skeleton-card">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
          <div className="card recipe skeleton-card">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="card" role="alert">
          <p className="muted">{error || t('recipesError')}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setReload((value) => value + 1)}
          >
            {t('tryAgain')}
          </button>
        </div>
      )}

      {status === 'ready' && bundle && (
        <div className="recipe-list">
          {bundle.recipes.map((recipe, index) => (
            <RecipeCard
              key={`${recipe.title}-${index}`}
              recipe={recipe}
              allergies={allergies}
              index={index}
            />
          ))}
          <p className="fine recipe-disclaimer">{t('recipeDisclaimer')}</p>
        </div>
      )}
    </section>
  )
}

function RecipeCard({
  recipe,
  allergies,
  index,
}: {
  recipe: Recipe
  allergies: string[]
  index: number
}) {
  const t = useT()
  const lang = useLang()
  const matched = new Set<string>()
  for (const ingredient of recipe.ingredients) {
    for (const id of ingredientConflicts(ingredient.allergens, allergies)) matched.add(id)
  }
  const blockedNames = Array.from(matched).map((id) =>
    t(`allergen_${allergenKey(id)}` as StringKey),
  )
  const titleId = `recipe-title-${index}`

  return (
    <article className={`card recipe ${matched.size > 0 ? 'recipe-blocked-card' : ''}`} aria-labelledby={titleId}>
      <div className="recipe-head">
        <h2 id={titleId}>{recipe.title}</h2>
        <span className="recipe-time">{t('recipeMinutes', { count: recipe.minutes })}</span>
      </div>
      <p className="recipe-summary">{recipe.summary}</p>

      <div className="macro-row">
        <span>{t('recipeKcal', { count: recipe.kcal })}</span>
        <span>{t('recipeProtein', { count: recipe.protein_g })}</span>
        <span>{t('recipeSugar', { count: recipe.sugar_g })}</span>
        <span>{t('recipeServings', { count: recipe.servings })}</span>
      </div>

      {matched.size > 0 && (
        <p className="recipe-blocked" role="alert">
          <strong>{t('recipeBlocked')}</strong>
          <span>{t('recipeBlockedFor', { list: blockedNames.join(lang === 'zh-HK' ? '、' : ', ') })}</span>
        </p>
      )}

      {recipe.tags.length > 0 && (
        <div className="tag-row">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
      )}

      <h3>{t('ingredients')}</h3>
      <ul className="recipe-ingredients">
        {recipe.ingredients.map((ingredient) => (
          <li key={ingredient.name}>{ingredient.name}</li>
        ))}
      </ul>

      <h3>{t('steps')}</h3>
      <ol className="recipe-steps">
        {recipe.steps.map((step, stepIndex) => (
          <li key={`${stepIndex}-${step.slice(0, 12)}`}>{step}</li>
        ))}
      </ol>
    </article>
  )
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
