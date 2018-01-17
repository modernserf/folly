import DB from './db'

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

it('subway route', () => {
    const db = new DB([
        { from: 'Park Street', to: 'Downtown Crossing' },
        { from: 'Downtown Crossing', to: 'South Station' },
        { from: 'Haymarket', to: 'Government Center' },
        { from: 'Government Center', to: 'Park Street' },
        { from: 'Government Center', to: 'State Street' },
        { from: 'State Street', to: 'Aquarium' },
        { from: 'State Street', to: 'Downtown Crossing' },
        (q) => [
            { from: q.from, to: q.to, link: { from: q.from, to: q.to } },
            { from: q.from, to: q.to },
        ],
        (q) => [
            { from: q.to, to: q.from, link: { from: q.from, to: q.to } },
            { from: q.from, to: q.to },
        ],
        (q) => [
            { it: q.value, not_in: [] },
        ],
        (q) => [
            { it: q.value, not_in: { head: q.head, tail: q.tail } },
            { it: q.value, not: q.head },
            { it: q.value, not_in: q.tail },
        ],
        (q) => [
            { from: q.from, to: q.from, path: [] },
        ],
        (q) => [
            { from: q.from, to: q.end, path: { head: q.link, tail: q.rest } },
            { from: q.from, to: q.next, link: q.link },
            { it: q.link, not_in: q.rest },
            { from: q.next, to: q.end, path: q.rest },
        ],
    ])

    const result = db.query((q) => [
        { from: 'South Station', to: 'Aquarium', path: q.path },
    ]).one().path
    expect(result).toEqual([
        { from: 'Downtown Crossing', to: 'South Station' },
        { from: 'State Street', to: 'Downtown Crossing' },
        { from: 'State Street', to: 'Aquarium' },
    ])
})

it('call/1', () => {
    const db = new DB([
        { foo: 1 },
        { foo: 2 },
    ])

    expect(db.query((q) => [
        { call: { foo: 1 } },
    ]).any()).toBe(true)

    expect(db.query((q) => [
        { call: { foo: 100 } },
    ]).any()).toBe(false)
})

it('append/3', () => {
    const db = new DB([
        (q) => [
            { left: [], right: q.right, joined: q.right },
        ],
        (q) => [
            { left: { head: q.lh, tail: q.lt }, right: q.right, joined: { head: q.lh, tail: q.rest } },
            { left: q.lt, right: q.right, joined: q.rest },
        ],
    ])

    const joins = db.query((q) => [
        { left: ['a', 'b', 'c'], right: ['d', 'e'], joined: q.joined },
    ]).one()
    expect(joins.joined).toEqual(['a', 'b', 'c', 'd', 'e'])

    const splits = db.query((q) => [
        { left: ['a', 'b', 'c'], right: q.right, joined: ['a', 'b', 'c', 'd', 'e'] },
    ]).one()
    expect(splits.right).toEqual(['d', 'e'])
})

it('tracery', () => {
    const db = new DB([
        {
            rule: 'warning',
            options: [[
                { lit: 'this is a' }, { rule: 'test' }, { lit: 'of the emergency' }, { rule: 'broadcast' },
                { lit: 'system. this is only a' }, { rule: 'test' }]],
        },
        { rule: 'test', options: [{ lit: 'test' }, { lit: 'trial' }, { lit: 'experiment' }] },
        { rule: 'broadcast', options: [{ lit: 'broadcast' }, { lit: 'program' }, { lit: 'podcast' }] },

        // member/2
        (q) => [
            { it: q.member, in: { head: q.member, tail: q._ } },
        ],
        (q) => [
            { it: q.member, in: { head: q._, tail: q.t } },
            { it: q.member, in: q.t },
        ],

        (q) => [
            { render: { lit: q.lit }, output: q.lit },
        ],
        (q) => [
            { render: { rule: q.rule }, output: q.out },
            { rule: q.rule, options: q.options },
            { it: q.item, in: q.options },
            { render: q.item, output: q.out },
        ],

        { render: [], output: [] },
        (q) => [
            { render: { head: q.h, tail: q.t }, output: { head: q.oh, tail: q.ot } },
            { render: q.h, output: q.oh },
            { render: q.t, output: q.ot },
        ],
    ])
    const res = db.query((q) => [
        { render: { rule: 'warning' }, output: q.output },
    ]).one().output.join(' ')
    expect(res).toEqual('this is a test of the emergency broadcast system. this is only a test')
})
