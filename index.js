const fs = require('fs');
const _ = require('lodash');

const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

class ConvertCsvToJson {
	data = [];

	execute() {
		const csvData = fs.readFileSync('./input.csv');
		if (!csvData) throw new Error('Something Wrong');

		const bufferString = csvData.toString(); // transform Buffer Data to String
		const dataArray = bufferString.split('\r\n') // Split Data by breakline

		const headersArray = this.separateHeaders(dataArray);

		const arrayJsonData = [];

		const arrayFullname = dataArray.map((d) => this.removeComma(d)[0]);
		const arrayEid = dataArray.map((d) => this.removeComma(d)[1]);
		const arrayGroups = (...pos) => dataArray.map((d) => {
			const dataCommaRemoved = this.removeComma(d);

			const groupsString = _.at(dataCommaRemoved, ...pos).toString();
			const groups = groupsString.split(/[",/]/g).filter(g => !!g); // remove wrong characters;

			return groups.map(g => g.trim());
		});

		const arrayAdresses = (...pos) => dataArray.map((d) => {
			const dataCommaRemoved = this.removeComma(d);
			const addressesArray = [];

			const addressesString = _.at(dataCommaRemoved, ...pos).toString();
			const addresses = addressesString.split(/[",/]/g).filter(g => !!g); // remove wrong characters and empty items;

			_.forEach(addresses, (ad, i) => {
				const separatedHeader = _.at(headersArray, [2, 3, 4, 5, 6, 7]);
				// remove quotes and separate types and tags;
				const quotesSeparatedHeader = separatedHeader[i].replace(/"/g, '').split(' ');
				quotesSeparatedHeader.splice(0, 1)[0];
				const tags = quotesSeparatedHeader;
				const obj = {};

				if (/[A-Z]/gi.test(ad)) { // is a digit value (email or something)
					if (this.validateEmail(ad.split(' ')[0])) { // verify if is email field
						obj.type = 'email';
						obj.address = ad;
					}
				} else {
					const parsedNumber = phoneUtil.parseAndKeepRawInput(ad, 'BR');
					const number = parsedNumber.getNationalNumber();
					const ddd = parsedNumber.getCountryCode();
					if (phoneUtil.isValidNumberForRegion(parsedNumber, 'BR')) {
						const numberWithDDD = `${ddd}${number}`;
						obj.type = 'phone';
						obj.address = numberWithDDD;
					}
				}
				obj.tags = tags;
				addressesArray.push(obj);
			});
			return addressesArray;
		});

		const arrayInvisible = (pos) => dataArray.map((d) => this.removeComma(d)[pos]);
		const arraySeeAll = (pos) => dataArray.map((d) => this.removeComma(d)[pos]);

		_.forEach(dataArray, (_, i) => {
			let obj = {};

			obj.fullname = arrayFullname[i];
			obj.eid = arrayEid[i];
			obj.groups = arrayGroups([8, 9])[i];
			obj.addresses = arrayAdresses([2, 3, 4, 5, 6, 7])[i];
			obj.invisible = !!arrayInvisible(10)[i];
			obj.see_all = this.translateStringToBoolean(arraySeeAll(11)[i]);

			if (obj.eid) arrayJsonData.push(obj); // only add to array if Eid exists
		});

		arrayJsonData.map((curr, ind) => {
			const nextObj = arrayJsonData[ind+1];
			if (curr.eid == nextObj?.eid) {
				// remove duplicated eid by index
				arrayJsonData.splice(ind+1, 1);

				curr.addresses.push(...nextObj.addresses);
				curr.addresses = _.uniq(curr.addresses);

				curr.groups.push(...nextObj.groups);
				curr.groups = _.uniq(curr.groups);

				return curr;
			} return curr;
		});

		fs.writeFileSync('./output.json', JSON.stringify(arrayJsonData), 'utf8');
	}

	removeComma(value) {
		return value.split(',');
	}

	separateHeaders(dataArray) {
		const headers = dataArray.splice(0, 1); // Separate CSV header to make JSON attr
		const headersString = headers.toString(); // transform to string and after split the comma's

		return headersString.split(',');
	}

	validateEmail(email) {
		return String(email)
			.toLowerCase()
			.match(
				/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
			);
	};

	translateStringToBoolean(value) {
		const words = {
			'yes': true,
			'no': false,
			'': false,
			0: false,
			1: true
		}
		return words[value];
	}
}

const convertCsvToJson = new ConvertCsvToJson();
convertCsvToJson.execute();
