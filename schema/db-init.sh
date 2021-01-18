#!/bin/bash

set -euf -o pipefail

psql -U postgres -c 'create database jumpin;'
psql -U postgres -d jumpin -c 'create schema hop;'
psql -U postgres -d jumpin -c 'create extension citext;'
