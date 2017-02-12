const express = require('express')
const connect = require('./db')
const db_config = require('./db/config')
const sql = require('./db/queries')
const sms = require('flowroute-sms')('46038404', '1f70ff5b356776c434639f6efa6a01b2')
const app = express()
const api = express.Router()
const barter = express.Router()


const RX_DIGITS = /^\d+$/

async function main() {
	const db = await connect(db_config)

	api.get('/products', async (req, res) => {
		const { limit } = req.query

		let q = sql.get_products()

		if (limit !== undefined) {
			if (RX_DIGITS.test(limit)) {
				const products = await db.any(q + sql.limit(limit))
				res.json(products)
			} else {
				res.status(400).send(`limit must be a number`)
			}
		} else {
			const products = await db.any(q)
			res.json(products)
		}
	}).get('/purchased-products', async (req, res) => {
		const { id, u } = req.query

		if (id && !u) {
			const products = await db.any(sql.get_purchased_products_by_user_id(id, 'products.*'))
			res.json(products)
		} else if (u && !id) {
			const products = await db.any(sql.get_purchased_products_by_username(u, 'products.*'))
			res.json(products)
		} else {
			res.status(400).send(`must provide one of uuid (id) or username (u) fields`)
		}
	}).get('/users', async (req, res) => {
		const { id, u } = req.query

		if (id) {
			if (u) {
				res.status(400).send(`must not provide more than one of uuid (id) or username (u) fields`)
			} else {
				const user = await db.oneOrNone(sql.get_user_by_user_id(id))
				res.json(user)
			}
		} else {
			if (u) {
				const user = await db.oneOrNone(sql.get_user_by_username(u))
				res.json(user)
			} else {
				const users = await db.any(sql.get_users())
				res.json(users)
			}
		}
	}).get('/purchases', async (req, res) => {
		const purchases = await db.any(sql.get_purchases())
		res.json(purchases)
	})

	barter.get('/notify', async (req, res) => {
		const { bFor, bWith } = req.query
		//These are products uuids
		const bForProduct = await db.oneOrNone(sql.get_products_by_title(bFor))
		const bWithProduct = await db.oneOrNone(sql.get_products_by_title(bWith))
		//14154498865
		console.log(sql.get_user_by_user_id(bForProduct[0].owner_id));
		const desiredUser = await db.any(sql.get_user_by_user_id(bForProduct[0].owner_id))[0]
		if (!desiredUser) return;
		const confirmLink = `https://devweek-purse.herokuapp.com/barter/confirm?bFor=${bFor}&bWith=${bWith}`
		const denyLink = `https://devweek-purse.herokuapp.com/barter/cancel?bFor=${bFor}&bWith=${bWith}`
		sms.send(desiredUser.phone, '14154498865',
		`${desiredUser.username} is interested in bartering for your ${bForProduct.title} with their ${bWithProduct.title}`)
		sms.send(desiredUser.phone, '14154498865', 'CONFIRM: ' + confirmLink)
		sms.send(desiredUser.phone, '14154498865', 'DENY: ' + denyLink)
		console.log('success')
	}).get('/cancel', async (req, res) => {
		// const { bFor, bWith } = req.query
		// const bForProduct = await db.any(sql.get_products_by_id(bFor))
		// const bWith = await db.any(sql.get_products_by_id(bWith))
		// const deniedUser = await db.any(sql.get_user_by_user_id(bForProduct.owner_id))
	}).put('/confirm', async (req, res) => {
		// const { bFor, bWith } = req.query

	});

	app.use(function(req, res, next) {
	  res.header("Access-Control-Allow-Origin", "*");
	  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	  next();
	});

	app.use('/barter', barter)
	app.use('/api', api)
	app.get('/', (req, res) => {
		res.send('Hello!')
	})
	let port = process.env.PORT || 8080
	app.listen(port, () => {
		console.log('listening on port', port);
	})
}

main()
