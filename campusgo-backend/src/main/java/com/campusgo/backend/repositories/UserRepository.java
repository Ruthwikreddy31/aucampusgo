package com.campusgo.backend.repositories;

import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Boolean existsByEmail(String email);
    @Query("select count(distinct u) from User u join u.roles r where r = :role")
    long countByRolesContaining(Role role);

    @Query("select distinct u from User u join u.roles r where r = :role")
    List<User> findByRole(Role role);
}
