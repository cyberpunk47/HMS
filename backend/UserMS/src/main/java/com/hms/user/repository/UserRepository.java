package com.hms.user.repository;

import java.util.Optional;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.hms.user.entity.User;


@Repository
public interface UserRepository extends CrudRepository<User  , Long> {

    Optional<User> findByEmail(String email);

}
