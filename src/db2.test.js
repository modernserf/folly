import mapValues from 'lodash/mapValues'
import groupBy from 'lodash/groupBy'

const fun = (x) => typeof x === 'function'
const sym = (x) => typeof x === 'symbol'
const arr = (x) => Array.isArray(x)
const obj = (x) => x && typeof x === 'object'
const selector = (x) => {
    if (fun(x)) { return selector(x({})[0]) }
    return Object.keys(x).sort().join(',')
}

class DB {
    static RUN = Symbol('RUN')
    static list (...args) {
        return args.reduceRight((tail, value) => [value, tail])
    }
    constructor (rules) {
        this.rules = rules
        this._buildIndex()
    }
    query (queryFunc) {
        const gen = this._query(queryFunc)
        return Object.assign(gen, {
            all: () => [...gen],
            any: () => !gen.next().done,
            chain: () => this,
        })
    }
    * _query (queryFunc) {
        const { query, labelsToVars } = buildQueryMap(queryFunc)
        const initialState = {}
        for (const endState of this._run(query, initialState)) {
            const result = varsToLabels(endState, labelsToVars)
            if (result) { yield result }
        }
    }
    * _run ([query, ...restQueries], state) {
        // for each rule
        for (const rule of this._matchingRules(query)) {
            // for every unifying next state
            for (const nextState of this._runRule(state, query, rule)) {
                // if there are more queries, try them
                if (restQueries.length) {
                    yield * this._run(restQueries, nextState)
                // if this is the last query, yield the finished state
                } else {
                    yield nextState
                }
            }
        }
    }
    * _runRule (state, query, rule) {
        // special rule implementation (dif)
        if (rule[DB.RUN]) {
            yield * rule[DB.RUN](state, query)
        // normal rule
        } else if (fun(rule)) {
            const [head, ...body] = buildQueryMap(rule).query
            const nextState = unify(state, head, query)
            if (nextState) { yield * this._run(body, nextState) }
        // normal fact
        } else {
            const nextState = unify(state, query, rule)
            if (nextState) { yield nextState }
        }
    }
    _matchingRules (query) {
        return this._index[selector(query)] || []
    }
    _buildIndex () {
        this._index = groupBy([...this.rules], selector)
        this._index['it,not'] = [{ [DB.RUN]: dif }]
    }
}

function buildQueryMap (queryFunc) {
    const labelsToVars = new Proxy({}, {
        get: (target, name) => {
            if (!target[name]) {
                target[name] = Symbol(name)
            }
            return target[name]
        },
    })
    const query = queryFunc(labelsToVars)
    return { labelsToVars, query }
}

const set = (state, k, v) => ({ ...state, [k]: v })

function lookup (state, v) {
    if (sym(v) && state[v]) { return lookup(state, state[v]) }
    if (arr(v)) { return v.map((x) => lookup(state, x)) }
    if (obj(v)) { return mapValues(v, (x) => lookup(state, x)) }
    return v
}

const CONSTRAINTS = Symbol('CONSTRAINTS')
function unify (state, lhs, rhs) {
    const nextState = _unify(state, lhs, rhs)
    if (!nextState) { return null }

    for (const constraint of nextState[CONSTRAINTS] || []) {
        if (!constraint(nextState)) { return null }
    }
    return nextState
}

function _unify (state, lhs, rhs) {
    lhs = lookup(state, lhs)
    rhs = lookup(state, rhs)

    // literal equality
    if (lhs === rhs) { return state }
    // new binding
    if (sym(lhs)) { return set(state, lhs, rhs) }
    if (sym(rhs)) { return set(state, rhs, lhs) }

    // array
    if (arr(lhs) && arr(rhs)) {
        if (lhs.length !== rhs.length) { return null }
        let nextState = state
        for (let i = 0; i < lhs.length; i++) {
            nextState = unify(nextState, lhs[i], rhs[i])
            if (!nextState) { return null }
        }
        return nextState
    }
    // object
    if (obj(lhs) && obj(rhs)) {
        if (selector(lhs) !== selector(rhs)) { return null }
        let nextState = state
        for (const key in lhs) {
            nextState = unify(nextState, lhs[key], rhs[key])
            if (!nextState) { return null }
        }
        return nextState
    }
    return null
}

function * dif (prevState, query) {
    const head = { it: Symbol('it'), not: Symbol('not') }
    const nextState = { ...prevState }
    nextState[CONSTRAINTS] = (prevState[CONSTRAINTS] || []).concat([
        (state) => {
            // TODO: dif data structures
            return lookup(state, head.it) !== lookup(state, head.not)
        },
    ])

    const endState = unify(nextState, head, query)
    if (!endState) { return }
    yield endState
}

function varsToLabels (state, labelsToVars) {
    return mapValues(labelsToVars, (vr) => state[vr])
}

const simpsons = [
    { parent: 'Abe', child: 'Homer' },
    { parent: 'Mona', child: 'Homer' },
    { parent: 'Clancy', child: 'Marge' },
    { parent: 'Jacqueline', child: 'Marge' },
    { parent: 'Clancy', child: 'Patty' },
    { parent: 'Jacqueline', child: 'Patty' },
    { parent: 'Clancy', child: 'Selma' },
    { parent: 'Jacqueline', child: 'Selma' },
    { parent: 'Homer', child: 'Bart' },
    { parent: 'Homer', child: 'Lisa' },
    { parent: 'Homer', child: 'Maggie' },
    { parent: 'Marge', child: 'Bart' },
    { parent: 'Marge', child: 'Lisa' },
    { parent: 'Marge', child: 'Maggie' },
    (q) => [
        { grandparent: q.grandparent, grandchild: q.grandchild },
        { parent: q.grandparent, child: q.middle },
        { parent: q.middle, child: q.grandchild },
    ],
]

it('finds facts', () => {
    const db = new DB(simpsons)
    const results = db.query((q) => [
        { parent: 'Homer', child: q.child },
    ]).all()
    expect(results.map(x => x.child).sort()).toEqual(['Bart', 'Lisa', 'Maggie'])
})

it('chains queries', () => {
    const db = new DB(simpsons)
    const results = db.query((q) => [
        { parent: 'Abe', child: q.child },
        { parent: q.child, child: q.grandchild },
    ]).all()
    expect(results.map(x => x.grandchild).sort()).toEqual(['Bart', 'Lisa', 'Maggie'])
})

it('chains queries in arbitrary order', () => {
    const db = new DB(simpsons)

    const results = db.query((q) => [
        { parent: q.child, child: q.grandchild },
        { parent: 'Abe', child: q.child },
    ]).all()

    expect(results.map(x => x.grandchild).sort()).toEqual(['Bart', 'Lisa', 'Maggie'])
})

it('handles rules', () => {
    const db = new DB(simpsons)

    const results = db.query((q) => [
        { grandparent: q.grandparent, grandchild: 'Lisa' },
    ]).all()

    expect(results.map((x) => x.grandparent).sort()).toEqual(['Abe', 'Clancy', 'Jacqueline', 'Mona'])
})

it('basic dif', () => {
    const db = new DB(simpsons)

    const results = db.query((q) => [
        { parent: 'Homer', child: q.child },
        { it: q.child, not: 'Bart' },
    ]).all()

    expect(results.map(x => x.child).sort()).toEqual(['Lisa', 'Maggie'])
})

it('delayed dif', () => {
    const db = new DB(simpsons)

    const results = db.query((q) => [
        { it: q.child, not: 'Bart' },
        { parent: 'Homer', child: q.child },
    ]).all()

    expect(results.map(x => x.child).sort()).toEqual(['Lisa', 'Maggie'])
})
