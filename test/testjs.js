import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:9000';

const tokens = JSON.parse(open('./tokens.json'));

const patients = tokens.filter(x => x.role === 'PATIENT');
const doctors = tokens.filter(x => x.role === 'DOCTOR');

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export const options = {
    scenarios: {
        load: {
            executor: 'constant-arrival-rate',
            rate: 1000,
            timeUnit: '1m',
            duration: '1m',
            preAllocatedVUs: 50,
            maxVUs: 200,
        },
    },
};

export default function () {

    const usePatient = Math.random() < 0.5;

    let account;
    let url;

    if (usePatient) {

        account = randomItem(patients);

        const choice = Math.floor(Math.random() * 5);

        if (choice === 0) {
            url = `${BASE_URL}/profile/patient/get/${account.profileId}`;

        } else if (choice === 1) {
            url = `${BASE_URL}/appointment/getAllByPatient/${account.profileId}`;

        } else if (choice === 2) {
            url = `${BASE_URL}/appointment/countByPatient/${account.profileId}`;

        } else if (choice === 3) {
            url = `${BASE_URL}/appointment/countReasonByPatient/${account.profileId}`;

        } else {
            url = `${BASE_URL}/notification/patient/${account.profileId}`;
        }

    } else {

        account = randomItem(doctors);

        const choice = Math.floor(Math.random() * 5);

        if (choice === 0) {
            url = `${BASE_URL}/profile/doctor/get/${account.profileId}`;

        } else if (choice === 1) {
            url = `${BASE_URL}/appointment/getAllByDoctor/${account.profileId}`;

        } else if (choice === 2) {
            url = `${BASE_URL}/appointment/countByDoctor/${account.profileId}`;

        } else if (choice === 3) {
            url = `${BASE_URL}/appointment/countReasonByDoctor/${account.profileId}`;

        } else {
            url = `${BASE_URL}/appointment/patients/doctor/${account.profileId}/dropdown`;
        }
    }

    const res = http.get(url, {
        headers: {
            Authorization: `Bearer ${account.token}`,
        },
    });

    check(res, {
        'status 2xx': r =>
            r.status >= 200 && r.status < 300,
    });
}